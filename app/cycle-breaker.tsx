/* app/cycle-breaker.tsx */
import * as _React from 'react'; 
import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import Purchases, { type CustomerInfo } from 'react-native-purchases';

import { supabase } from '../src/lib/supabase';
import MediatorPaywall from '../components/MediatorPaywall';

interface PurchasesInterface {
  getCustomerInfo(): Promise<CustomerInfo>;
}
const RC = Purchases as unknown as PurchasesInterface;

const MAX_FREE_SESSIONS = 1; 
const REQUIRED_SESSIONS = 3;

export default function CycleBreakerScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<string>("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [usageCount, setUsageCount] = useState(0); 
  const [showPaywall, setShowPaywall] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const UNIFORM_SPACING = 0.5;

  useEffect(() => {
    checkSubscriptionAndUsage();
  }, []);

  const checkSubscriptionAndUsage = async () => {
    try {
      let active = false;
      try {
        const customerInfo = await RC.getCustomerInfo();
        active = customerInfo.entitlements.active['mediator_access'] !== undefined;
      } catch (rcError) {
        console.log("RC Offline on Load - Cycle Breaker");
      }
      
      setIsSubscribed(active);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('cycle_breaker_usage_count') 
          .eq('id', user.id)
          .single();
        
        if (profile) setUsageCount(profile.cycle_breaker_usage_count ?? 0);
      }
    } catch (_e: unknown) {
      setIsSubscribed(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    const cleanText = text.replace(/["“”]+/g, '').replace(/^[^a-zA-Z0-9]+/, '').trim();
    await Clipboard.setStringAsync(`"${cleanText}"`);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const runAnalysis = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert("Auth Error", "You must be logged in to use the Cycle Breaker.");
      return;
    }

    let hasAccess = false;
    try {
      const customerInfo = await RC.getCustomerInfo();
      hasAccess = customerInfo.entitlements.active['mediator_access'] !== undefined;
    } catch (rcError) {
      console.log("RevenueCat Offline - Defaulting to Free Tier");
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('cycle_breaker_usage_count')
      .eq('id', user.id)
      .single();
    
    const currentUsage = profile?.cycle_breaker_usage_count || 0;

    if (!hasAccess && currentUsage >= MAX_FREE_SESSIONS) {
      setShowPaywall(true);
      return;
    }

    setLoading(true);
    setInsight("");
    fadeAnim.setValue(0);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      // 🛡️ CRITICAL FIX: Ensure user_name is pulled from the database for the Edge Function
      const { data: logs, count } = await supabase
        .from('mediator_logs')
        .select('user_name, user_perspective, partner_perspective, created_at, partner_name', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const currentLogsCount = count || 0;

      if (!logs || currentLogsCount < REQUIRED_SESSIONS) {
        const remaining = REQUIRED_SESSIONS - currentLogsCount;
        setInsight(
          `I'm still gathering data on your interactions (${currentLogsCount}/${REQUIRED_SESSIONS}). ` +
          `I need ${remaining} more Neutral Mediator session${remaining > 1 ? 's' : ''} recorded to accurately map your loop, ` +
          `identify the triggers, expose the mechanics, and break the pattern!!`
        );
      } else {
        const { data, error: fnError } = await supabase.functions.invoke('analyze-patterns', {
          body: { logs, partnerName: logs[0]?.partner_name || "Partner" }
        });

        if (fnError) {
          console.error("Edge Function Rejected Request:", fnError);
          setInsight("Diagnostic Alert: The AI server rejected the request. This is usually due to API limits or a missing Claude key.");
          Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
          setLoading(false);
          return;
        }

        setInsight(data.insight || "No patterns identified.");

        if (!hasAccess) {
          const newCount = currentUsage + 1;
          await supabase.from('profiles').update({ cycle_breaker_usage_count: newCount }).eq('id', user.id);
          setUsageCount(newCount);
        }
      }
      
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    } catch (_e: any) {
      console.error("Cycle Breaker Error:", _e);
      setInsight("The analysis service is temporarily unavailable. Please try again shortly.");
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    } finally {
      setLoading(false);
    }
  };

  const renderStyledText = (text: string) => {
    if (!text) return null;
    let formatted = text.replace(/^\s*\*+\s*$/gm, ''); 
    formatted = formatted.replace(/\*+$/gm, '');      
    formatted = formatted.replace(/^(\d[\.)]\s+)\*\*([^*]+)\*\*/gm, '**$1$2**');
    formatted = formatted.replace(/(?:-?\s*Step-by-step instructions:?)/gi, '**-Step-by-Step Instructions**');
    formatted = formatted.trim().replace(/(\*\*[^*]+\*\*)\s*\n+/, '$1\n');
    formatted = formatted.replace(/\n\s*\n/g, '\n');
    formatted = formatted.replace(/([^\n])(\s*(?:\d[\.)]|\*|-|•)\s+)/g, '$1\n$2');

    const parts = formatted.split('**');
    return (
      <Text style={[styles.cardBodyText, { letterSpacing: UNIFORM_SPACING }]}>
        {parts.map((part, index) => {
          const isSubtitle = part.includes("-Step-by-Step Instructions");
          const isBold = index % 2 === 1;
          return (
            <Text 
              key={index} 
              style={{
                fontWeight: isBold ? '900' : '500',
                color: isBold ? (isSubtitle ? '#FFF' : '#00A36C') : '#FFF'
              }}
            >
              {part}
            </Text>
          );
        })}
      </Text>
    );
  };

  const renderContent = () => {
    if (!insight) return null;
    
    // 🛡️ THE FIX: Universal catch-all so the screen never goes blank
    if (!insight.includes("[The Cycle]")) {
        return (
            <View style={[styles.card, { borderLeftColor: '#fbbf24' }]}>
                <View style={styles.cardHeader}>
                    <MaterialCommunityIcons name="information-outline" size={20} color="#fbbf24" />
                    <Text style={[styles.cardLabel, { color: '#fbbf24', letterSpacing: 1.5 }]}>
                        {insight.includes("Diagnostic") || insight.includes("unavailable") ? "SYSTEM STATUS" : "DATA COLLECTION"}
                    </Text>
                </View>
                <Text style={styles.cardBodyText}>{insight}</Text>
            </View>
        );
    }

    // 🛡️ Added the [The Infinity Loop] section
    const sections = [
      { key: '[The Cycle]', label: 'THE CYCLE', icon: 'sync-alert', color: '#f43f5e' },
      { key: '[The Infinity Loop]', label: 'THE INFINITY LOOP', icon: 'infinity', color: '#a855f7' },
      { key: '[The Triggers]', label: 'THE TRIGGERS', icon: 'lightning-bolt', color: '#fbbf24' },
      { key: '[The Circuit Breaker]', label: 'THE CIRCUIT BREAKER', icon: 'shield-check', color: '#4ECDC4' },
    ] as const;

    let contentBlocks = [];
    
    sections.forEach((section, idx) => {
      const startIdx = insight.indexOf(section.key);
      if (startIdx === -1) return;
      
      const nextSection = sections[idx + 1];
      const contentStart = startIdx + section.key.length;
      const nextIdx = nextSection ? insight.indexOf(nextSection.key) : -1;
      const endIdx = nextIdx !== -1 ? nextIdx : insight.length;
      
      const sectionBody = insight.substring(contentStart, endIdx).trim();
      if (!sectionBody) return;

      const toolBlocks = sectionBody.split(/(?=\n?\s*\d[\.)]\s+)/).filter(b => b.trim().length > 0);

      contentBlocks.push(
        <View key={section.key} style={[styles.card, { borderLeftColor: section.color }]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name={section.icon} size={20} color={section.color} />
            <Text style={[styles.cardLabel, { color: section.color, letterSpacing: 1.5 }]}>
              {section.label}
            </Text>
          </View>
          <View>
            {toolBlocks.map((block, blockIdx) => {
              const scriptHeaderMatch = block.match(/(?:Tactical Script|Script):?/i);
              let instructions = block;
              let script = "";
              if (scriptHeaderMatch) {
                const splitIdx = scriptHeaderMatch.index!;
                instructions = block.substring(0, splitIdx).trim();
                script = block.substring(splitIdx + scriptHeaderMatch[0].length).trim();
              }
              return (
                <View key={blockIdx} style={{ marginBottom: blockIdx < toolBlocks.length - 1 ? 15 : 0 }}>
                  {renderStyledText(instructions)}
                  {script && (
                    <TouchableOpacity 
                      style={styles.scriptBubble} 
                      onPress={() => copyToClipboard(script)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.scriptLabelRow}>
                        <MaterialCommunityIcons name="message-text-outline" size={12} color="#4ECDC4" />
                        <Text style={styles.scriptLabel}>TACTICAL SCRIPT</Text>
                      </View>
                      <Text style={styles.scriptText}>
                        "{script.replace(/["“”]+/g, '').replace(/^[^a-zA-Z0-9]+/, '').trim()}"
                      </Text>
                      <Text style={styles.copyHint}>TAP TO COPY</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      );
    });
    
    return contentBlocks;
  };

  return (
    <SafeAreaView style={styles.container}>
      <MediatorPaywall isVisible={showPaywall} onClose={() => { setShowPaywall(false); checkSubscriptionAndUsage(); }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#D4AF37" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { letterSpacing: 2 }]}>THE CYCLE BREAKER</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="sync-off" size={40} color="#D4AF37" />
          </View>
          <Text style={[styles.heroText, { letterSpacing: UNIFORM_SPACING }]}>
            Identify the triggers. Expose the mechanics. {"\n"}Break the pattern.
          </Text>
          {!insight && !loading && (
            <TouchableOpacity style={styles.mainCta} onPress={runAnalysis}>
              <Text style={[styles.ctaText, { letterSpacing: 1.5 }]}>START ANALYSIS</Text>
            </TouchableOpacity>
          )}
        </View>
        {loading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#D4AF37" />
            <Text style={[styles.loaderText, { letterSpacing: UNIFORM_SPACING }]}>Analyzing patterns...</Text>
          </View>
        )}
        {insight && !loading && (
          <Animated.View style={{ opacity: fadeAnim }}>
            {renderContent()}
            <TouchableOpacity style={styles.refreshButton} onPress={runAnalysis}>
              <MaterialCommunityIcons name="cached" size={16} color="#64748b" />
              <Text style={[styles.refreshText, { letterSpacing: UNIFORM_SPACING }]}>RE-SCAN PATTERNS</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { color: '#D4AF37', fontSize: 14, fontWeight: '900' },
  backButton: { padding: 8 },
  scrollContent: { padding: 24, paddingBottom: 150 },
  heroSection: { alignItems: 'center', marginBottom: 10 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(212, 175, 55, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.2)' },
  heroText: { color: '#94a3b8', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  mainCta: { backgroundColor: '#D4AF37', paddingVertical: 18, paddingHorizontal: 40, borderRadius: 15 },
  ctaText: { color: '#0f172a', fontWeight: '900', fontSize: 14 },
  loaderContainer: { marginTop: 40, alignItems: 'center' },
  loaderText: { color: '#64748b', textAlign: 'center', marginTop: 20, fontSize: 13 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, marginBottom: 16, borderLeftWidth: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  cardLabel: { fontSize: 11, fontWeight: '900' },
  cardBodyText: { color: '#FFF', fontSize: 15, lineHeight: 20, fontWeight: '500' },
  scriptBubble: { backgroundColor: 'rgba(78, 205, 196, 0.08)', borderRadius: 12, padding: 18, marginTop: 15, borderWidth: 1, borderColor: 'rgba(78, 205, 196, 0.2)', borderStyle: 'dashed' },
  scriptLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  scriptLabel: { color: '#4ECDC4', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  scriptText: { color: '#FFF', fontSize: 15, fontStyle: 'italic', lineHeight: 20, textAlign: 'center' },
  copyHint: { color: '#64748b', fontSize: 8, fontWeight: '800', textAlign: 'center', marginTop: 10 },
  refreshButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 25, marginBottom: 40 },
  refreshText: { color: '#64748b', fontSize: 11, fontWeight: '700' }
});