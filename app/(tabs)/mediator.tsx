/* app/(tabs)/mediator.tsx */
// @ts-nocheck: Bypassing Deno linter for mobile-specific React Native modules
import * as _React from "react"; 
import { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, 
  ActivityIndicator, Alert, Keyboard, Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { type CustomerInfo } from 'react-native-purchases';

import { supabase } from '../../src/lib/supabase';
import MediatorPaywall from '../../components/MediatorPaywall';
import { useVoice } from '../../components/useVoice';

type AsyncStorageType = { setItem: (key: string, value: string) => Promise<void> };
const Storage = AsyncStorage as unknown as AsyncStorageType;

interface PurchasesInterface {
  getCustomerInfo(): Promise<CustomerInfo>;
}
const RC = Purchases as unknown as PurchasesInterface;

const MAX_FREE_SESSIONS = 3;

export default function MediatorScreen() {
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  const [userName, setUserName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [personA, setPersonA] = useState('');
  const [personB, setPersonB] = useState('');
  const [loading, setLoading] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [adviceSections, setAdviceSections] = useState<{title: string, content: string}[]>([]);

  const voiceA = useVoice();
  const voiceB = useVoice();

  useEffect(() => {
    initializeMediator();
  }, []);

  useEffect(() => {
    if (voiceA.isRecording || voiceB.isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [voiceA.isRecording, voiceB.isRecording, pulseAnim]);

  const initializeMediator = async () => {
    try {
      let hasActiveSub = false;
      try {
        const customerInfo = await RC.getCustomerInfo();
        hasActiveSub = customerInfo.entitlements.active['mediator_access'] !== undefined;
      } catch (rcError) {
        console.log("RC Offline on Load");
      }

      if (hasActiveSub) {
        setUsageCount(-1); 
        return;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('mediator_usage_count')
          .eq('id', user.id)
          .single();

        if (profile) {
          const count = profile.mediator_usage_count ?? 0;
          setUsageCount(count);
          await Storage.setItem('mediator_usage_count', count.toString());
        }
      }
    } catch (e) {
      console.log("Mediator Init Error", e);
    }
  };

  const handleToggleVoiceA = async () => {
    if (voiceA.isRecording) {
      const text = await voiceA.stopRecording();
      if (text) setPersonA(prev => prev ? `${prev} ${text}` : text);
    } else {
      if (voiceB.isRecording) await voiceB.stopRecording();
      await voiceA.startRecording();
    }
  };

  const handleToggleVoiceB = async () => {
    if (voiceB.isRecording) {
      const text = await voiceB.stopRecording();
      if (text) setPersonB(prev => prev ? `${prev} ${text}` : text);
    } else {
      if (voiceA.isRecording) await voiceA.stopRecording();
      await voiceB.startRecording();
    }
  };

  const saveMediationToSupabase = async (fullRawResponse: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('mediator_logs').insert([{
        user_id: user.id,
        user_name: userName,
        partner_name: partnerName,
        user_perspective: personA,
        partner_perspective: personB,
        ai_response: fullRawResponse,
        created_at: new Date().toISOString(),
      }]);
    } catch (err) {
      console.error("Supabase Save Error:", err);
    }
  };

  const parseAdvice = (text: string) => {
    const formatted = [];
    const regex = /\[(.*?)\]([^\[]+)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const title = match[1].trim();
      let content = match[2].trim();

      content = content.replace(/^#+ /gm, '').trim();
      content = content.replace(/#$/, '').trim();

      if (title.toLowerCase().includes('bridge')) {
        content = content.replace(new RegExp(`(?<!^)${partnerName},`, 'g'), `\n\n${partnerName},`);
      }

      formatted.push({ title, content });
    }

    if (formatted.length === 0) {
      formatted.push({ title: "Analysis", content: text.replace(/#/g, '').trim() });
    }

    setAdviceSections(formatted);
  };

  const handleMediate = async () => {
    if (!personA.trim() || !personB.trim() || !userName.trim() || !partnerName.trim()) {
      Alert.alert("Hold on", "Names and perspectives are required.");
      return;
    }
    
    Keyboard.dismiss();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Auth Error", "You must be logged in to use the Mediator.");
        setLoading(false);
        return;
      }

      let isSubscribed = false;
      try {
        const customerInfo = await RC.getCustomerInfo();
        isSubscribed = customerInfo.entitlements.active['mediator_access'] !== undefined;
      } catch (rcError) {
        console.log("RevenueCat Offline - Defaulting to Free Tier");
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('mediator_usage_count')
        .eq('id', user.id)
        .single();
      
      const currentUsage = profile?.mediator_usage_count || 0;

      if (!isSubscribed && currentUsage >= MAX_FREE_SESSIONS) {
        setShowPaywall(true);
        setLoading(false);
        return;
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const { data, error } = await supabase.functions.invoke('mediate-conflict', {
        body: { userName, partnerName, personA, personB }
      });

      // 🛡️ PUBLISHABLE READY: Prevent "Uncaught in Promise" crash by handling the error directly
      if (error) {
        console.error("Edge Function Error:", error);
        Alert.alert("Diagnostic Server Error", error.message || "The AI server returned an error.");
        setLoading(false);
        return;
      }

      if (data?.analysis) {
        parseAdvice(data.analysis);
        await saveMediationToSupabase(data.analysis);
        
        if (!isSubscribed) {
          const newCount = currentUsage + 1;
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ mediator_usage_count: newCount })
            .eq('id', user.id);

          if (!updateError) {
            setUsageCount(newCount);
            await Storage.setItem('mediator_usage_count', newCount.toString());
          }
        }
      } else if (data?.error) {
        Alert.alert("AI Error", data.error);
      }
    } catch (_error: any) { 
      console.error("Mediate Client Error:", _error);
      Alert.alert("Error", "The Mediator is currently unreachable. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const startNewMediation = () => {
    setAdviceSections([]);
    setPersonA('');
    setPersonB('');
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const isTranscribing = voiceA.transcribing || voiceB.transcribing;

  return (
    <SafeAreaView style={styles.container}>
      <MediatorPaywall isVisible={showPaywall} onClose={() => { setShowPaywall(false); initializeMediator(); }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconPad}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#94a3b8" />
          </TouchableOpacity>
          <MaterialCommunityIcons name="scale-balance" size={26} color="#D4AF37" />
          
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Neutral Mediator</Text>
            <Text style={styles.subTitle}>
              {usageCount === -1 ? 'UNLIMITED ACCESS' : `Usage: ${usageCount}/${MAX_FREE_SESSIONS} Free`}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {adviceSections.length === 0 ? (
            <View style={styles.card}>
              <View style={styles.nameRow}>
                <View style={styles.nameInputContainer}>
                  <Text style={styles.label}>Partner A</Text>
                  <TextInput 
                      style={styles.nameInput} 
                      value={userName} 
                      onChangeText={setUserName} 
                      placeholder="Name" 
                      placeholderTextColor="#475569"
                      autoCapitalize="words"
                  />
                </View>
                <View style={styles.nameInputContainer}>
                  <Text style={styles.label}>Partner B</Text>
                  <TextInput 
                    style={styles.nameInput} 
                    value={partnerName} 
                    onChangeText={setPartnerName} 
                    placeholder="Name" 
                    placeholderTextColor="#475569" 
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.inputSection}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>{userName.toUpperCase() || 'A'}&apos;S PERSPECTIVE</Text>
                  {voiceA.isRecording && (
                    <Animated.View style={[styles.listeningBadge, { opacity: pulseAnim }]}>
                      <Text style={styles.listeningText}>LISTENING...</Text>
                    </Animated.View>
                  )}
                  <Animated.View style={{ transform: [{ scale: voiceA.isRecording ? pulseAnim : 1 }] }}>
                    <TouchableOpacity 
                      onPress={handleToggleVoiceA} 
                      style={[styles.micBtn, voiceA.isRecording && styles.micBtnActive]}
                    >
                      <MaterialCommunityIcons 
                        name={voiceA.isRecording ? "microphone" : "microphone-outline"} 
                        size={18} 
                        color={voiceA.isRecording ? "#fff" : "#4ECDC4"} 
                      />
                    </TouchableOpacity>
                  </Animated.View>
                </View>
                <TextInput 
                  style={[styles.input, voiceA.isRecording && styles.inputActive]} 
                  multiline 
                  value={personA} 
                  onChangeText={setPersonA} 
                  placeholder={voiceA.isRecording ? "" : "Tap mic to start speaking..."} 
                  placeholderTextColor="#475569" 
                  autoCorrect autoCapitalize="sentences"
                />
              </View>

              <View style={styles.inputSection}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>{partnerName.toUpperCase() || 'B'}&apos;S PERSPECTIVE</Text>
                  {voiceB.isRecording && (
                    <Animated.View style={[styles.listeningBadge, { opacity: pulseAnim }]}>
                      <Text style={styles.listeningText}>LISTENING...</Text>
                    </Animated.View>
                  )}
                  <Animated.View style={{ transform: [{ scale: voiceB.isRecording ? pulseAnim : 1 }] }}>
                    <TouchableOpacity 
                      onPress={handleToggleVoiceB} 
                      style={[styles.micBtn, voiceB.isRecording && styles.micBtnActive]}
                    >
                      <MaterialCommunityIcons 
                        name={voiceB.isRecording ? "microphone" : "microphone-outline"} 
                        size={18} 
                        color={voiceB.isRecording ? "#fff" : "#4ECDC4"} 
                      />
                    </TouchableOpacity>
                  </Animated.View>
                </View>
                <TextInput 
                  style={[styles.input, voiceB.isRecording && styles.inputActive]} 
                  multiline 
                  value={personB} 
                  onChangeText={setPersonB}
                  placeholder={voiceB.isRecording ? "" : "Tap mic to start speaking..."} 
                  placeholderTextColor="#475569" 
                  autoCorrect autoCapitalize="sentences"
                />
              </View>

              <TouchableOpacity style={styles.mediateBtn} onPress={handleMediate} disabled={loading || isTranscribing}>
                {loading || isTranscribing ? (
                  <ActivityIndicator color="#0f172a" />
                ) : (
                  <Text style={styles.mediateBtnText}>Analyze Conflict</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.resultContainer}>
              {adviceSections.map((section, index) => (
                <View key={index} style={styles.adviceBox}>
                  <View style={styles.labelContainer}><Text style={styles.floatingLabel}>{section.title}</Text></View>
                  <Text style={styles.adviceText}>{section.content}</Text>
                  <TouchableOpacity style={styles.copyButton} onPress={() => copyToClipboard(section.content)}>
                    <MaterialCommunityIcons name="content-copy" size={16} color="#4ECDC4" />
                    <Text style={styles.copyText}>COPY</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.newSessionBtn} onPress={startNewMediation}>
                <Text style={styles.newSessionText}>Start New Mediation</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  headerText: { marginLeft: 12, flex: 1 },
  iconPad: { padding: 5 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: '800' },
  subTitle: { color: '#4ECDC4', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  scrollContent: { padding: 20, paddingBottom: 50 },
  card: { backgroundColor: '#1e293b', borderRadius: 24, padding: 20 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  nameInputContainer: { width: '48%' },
  nameInput: { backgroundColor: '#0f172a', borderRadius: 10, padding: 12, color: 'white', borderWidth: 1, borderColor: '#334155' },
  inputSection: { marginBottom: 15 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { color: '#64748b', fontSize: 10, fontWeight: '900' },
  listeningBadge: { backgroundColor: 'rgba(244, 63, 94, 0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.3)' },
  listeningText: { color: '#f43f5e', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  micBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(78, 205, 196, 0.1)', justifyContent: 'center', alignItems: 'center' },
  micBtnActive: { backgroundColor: '#f43f5e' },
  input: { backgroundColor: '#0f172a', borderRadius: 16, padding: 16, color: 'white', minHeight: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: 'transparent' },
  inputActive: { borderColor: '#f43f5e', shadowColor: '#f43f5e', shadowOpacity: 0.1, shadowRadius: 5 },
  mediateBtn: { backgroundColor: '#4ECDC4', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  mediateBtnText: { color: '#0f172a', fontWeight: '900' },
  resultContainer: { gap: 35 },
  adviceBox: { backgroundColor: '#1e293b', borderRadius: 20, padding: 22, paddingTop: 35, paddingBottom: 45, borderWidth: 1, borderColor: 'rgba(78, 205, 196, 0.15)' },
  labelContainer: { position: 'absolute', top: -12, left: 0, right: 0, alignItems: 'center' },
  floatingLabel: { backgroundColor: '#4ECDC4', color: '#0f172a', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, fontSize: 10, fontWeight: '900' },
  adviceText: { color: '#cbd5e1', fontSize: 15, lineHeight: 24, textAlign: 'left', paddingHorizontal: 5 },
  copyButton: { position: 'absolute', bottom: 12, right: 15, flexDirection: 'row', alignItems: 'center', gap: 5 },
  copyText: { color: '#4ECDC4', fontSize: 10, fontWeight: '800' },
  newSessionBtn: { padding: 18, backgroundColor: 'rgba(78, 205, 196, 0.1)', borderRadius: 12, alignItems: 'center', marginTop: 10 },
  newSessionText: { color: '#4ECDC4', fontWeight: '700' }
});