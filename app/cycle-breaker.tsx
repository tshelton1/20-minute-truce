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

import { supabase } from '../src/lib/supabase';
import PremiumPaywall from '../components/PremiumPaywall';
import {
  canUse,
  FREE_USAGE_LIMITS,
  getUsageCount,
  incrementUsage,
  isPremium,
} from '../src/lib/usageGate';

const MAX_FREE_SESSIONS = FREE_USAGE_LIMITS.analyzer;
const MIN_SESSIONS_FOR_REPORT = 2;

const PATTERN_SECTION_STYLES: Record<string, { icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string }> = {
  'WHAT KEEPS SHOWING UP': { icon: 'eye-outline', color: '#f43f5e' },
  'THE ONE FIGHT UNDERNEATH': { icon: 'target', color: '#a855f7' },
  'THE DANCE: WHO DOES WHAT': { icon: 'sync-alert', color: '#f43f5e' },
  'YOUR EARLY WARNING SIGNS': { icon: 'lightning-bolt', color: '#fbbf24' },
  'BREAK IT BEFORE IT STARTS: YOUR IF-THEN PLAYBOOK': { icon: 'shield-check', color: '#4ECDC4' },
  'WHAT YOU TWO DO RIGHT': { icon: 'heart-outline', color: '#4ECDC4' },
  'ONE HABIT FOR THIS MONTH': { icon: 'calendar-check', color: '#D4AF37' },
};

function titleCaseSectionTitle(raw: string): string {
  return raw.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function parsePatternReportSections(text: string): { key: string; title: string; body: string }[] {
  if (!/^#\s*\[/m.test(text)) return [];

  return text
    .split(/(?=^#\s*\[)/m)
    .map((chunk) => {
      const match = chunk.match(/^#\s*\[([^\]]+)\]\s*\n?([\s\S]*)/);
      if (!match) return null;

      const key = match[1].trim();
      return {
        key,
        title: titleCaseSectionTitle(key),
        body: match[2].trim(),
      };
    })
    .filter((section): section is { key: string; title: string; body: string } => !!section && !!section.body);
}

export default function CycleBreakerScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<string>("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [usageCount, setUsageCount] = useState(0); 
  const [showPaywall, setShowPaywall] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const UNIFORM_SPACING = 0.5;

  useEffect(() => {
    checkSubscriptionAndUsage();
  }, []);

  const checkSubscriptionAndUsage = async () => {
    try {
      const premium = await isPremium();
      setIsSubscribed(premium);

      if (premium) {
        setUsageCount(-1);
        return;
      }

      setUsageCount(await getUsageCount('analyzer'));
    } catch (_e: unknown) {
      setIsSubscribed(false);
    }
  };

  const handlePaywallClose = async () => {
    setShowPaywall(false);
    await checkSubscriptionAndUsage();

    if (await isPremium()) {
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      action?.();
    } else {
      pendingActionRef.current = null;
    }
  };

  const executeAnalysis = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert("Auth Error", "You must be logged in to use the Cycle Breaker.");
      return;
    }

    setLoading(true);
    setInsight("");
    fadeAnim.setValue(0);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { data: logs, error: logsError } = await supabase
        .from('mediator_logs')
        .select('user_name, partner_name, user_perspective, partner_perspective, ai_response, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (logsError) throw logsError;

      if (!logs || logs.length < MIN_SESSIONS_FOR_REPORT) {
        setInsight("Complete at least 2 truce sessions to unlock your Pattern Report");
      } else {
        const sessions = [...logs].reverse().map((l) => ({
          date: l.created_at,
          personA: l.user_perspective,
          personB: l.partner_perspective,
          analysis: l.ai_response,
        }));

        const { data, error: fnError } = await supabase.functions.invoke('analyze-patterns', {
          body: {
            userName: logs[0].user_name,
            partnerName: logs[0].partner_name,
            sessions,
          },
        });

        if (fnError) {
          console.error("Edge Function Rejected Request:", fnError);
          setInsight("We couldn't generate your Pattern Report right now. Please try again in a few minutes.");
          Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
          setLoading(false);
          return;
        }

        if (data?.error) {
          setInsight(data.error);
        } else {
          setInsight(data.pattern_report || "");

          if (data.pattern_report && !(await isPremium())) {
            const newCount = await incrementUsage('analyzer');
            setUsageCount(newCount);
          }
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

  const runAnalysis = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert("Auth Error", "You must be logged in to use the Cycle Breaker.");
      return;
    }

    if (!(await canUse('analyzer', user.id))) {
      pendingActionRef.current = () => { void executeAnalysis(); };
      setShowPaywall(true);
      return;
    }

    await executeAnalysis();
  };

  const renderStyledText = (text: string) => {
    if (!text) return null;

    const parts = text.split('**');
    return (
      <Text style={[styles.cardBodyText, { letterSpacing: UNIFORM_SPACING }]}>
        {parts.map((part, index) => {
          const isBold = index % 2 === 1;
          return (
            <Text
              key={index}
              style={{
                fontWeight: isBold ? '900' : '500',
                color: isBold ? '#00A36C' : '#FFF',
              }}
            >
              {part}
            </Text>
          );
        })}
      </Text>
    );
  };

  const renderFallbackCard = () => (
    <View style={[styles.card, { borderLeftColor: '#fbbf24' }]}>
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name="information-outline" size={20} color="#fbbf24" />
        <Text style={[styles.cardLabel, { color: '#fbbf24', letterSpacing: 1.5 }]}>
          {insight.includes("unavailable") || insight.includes("couldn't") ? "NOTICE" : "DATA COLLECTION"}
        </Text>
      </View>
      <Text style={styles.cardBodyText}>{insight}</Text>
    </View>
  );

  const renderContent = () => {
    if (!insight) return null;

    const sections = parsePatternReportSections(insight);
    if (sections.length === 0) {
      return renderFallbackCard();
    }

    return sections.map((section) => {
      const style = PATTERN_SECTION_STYLES[section.key] ?? {
        icon: 'text-box-outline' as const,
        color: '#D4AF37',
      };

      return (
        <View key={section.key} style={[styles.card, { borderLeftColor: style.color }]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name={style.icon} size={20} color={style.color} />
            <Text style={[styles.cardLabel, { color: style.color, letterSpacing: 1.5 }]}>
              {section.title}
            </Text>
          </View>
          {renderStyledText(section.body)}
        </View>
      );
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <PremiumPaywall isVisible={showPaywall} onClose={handlePaywallClose} />
      
      {/* 📱 iPad Fix: Wrapped Header in a Max Width container */}
      <View style={[styles.header, { maxWidth: 650, width: '100%', alignSelf: 'center' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#D4AF37" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { letterSpacing: 2 }]}>THE CYCLE BREAKER</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 📱 iPad Fix: Wrapped all main content in a Max Width container */}
        <View style={{ maxWidth: 650, width: '100%', alignSelf: 'center' }}>
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
        </View>

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
  refreshButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 25, marginBottom: 40 },
  refreshText: { color: '#64748b', fontSize: 11, fontWeight: '700' }
});
