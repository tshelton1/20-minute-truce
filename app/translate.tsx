/* app/translate.tsx */
// @ts-nocheck
import * as _React from "react"; 
import { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, SafeAreaView, 
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, 
  Alert, Share, Keyboard, Animated 
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import Purchases, { type CustomerInfo } from 'react-native-purchases';

interface PurchasesInterface {
  getCustomerInfo(): Promise<CustomerInfo>;
}
const RC = Purchases as unknown as PurchasesInterface;

import { supabase } from '../src/lib/supabase';
import TranslatorPaywall from '../components/TranslatorPaywall';
import { sharedStyles as styles } from '../components/sharedStyles';
import { useVoice } from '../components/useVoice'; 

const MAX_FREE_SESSIONS = 5;

export default function TranslatorScreen() {
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  const [text, setText] = useState('');
  const [tone, setTone] = useState('gentle');
  const [loading, setLoading] = useState(false);
  const [translatedText, setTranslatedText] = useState('');
  const [usageCount, setUsageCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const { isRecording, startRecording, stopRecording, transcribing } = useVoice();

  const tones = [
    { id: 'gentle', label: 'GENTLE', desc: 'Weaponize vulnerability to kill conflict.', icon: 'feather', color: '#4ade80' },
    { id: 'funny', label: 'WITTY', desc: 'Use high-level charm to bypass defenses.', icon: 'rocket-launch', color: '#facc15' },
  ] as const;

  useEffect(() => { 
    checkStatus(); 
  }, []);

  const checkStatus = async () => {
    try {
      let hasActiveSub = false;
      try {
        const customerInfo = await RC.getCustomerInfo();
        hasActiveSub = customerInfo.entitlements.active['translator_access'] !== undefined;
      } catch (e) {
        console.log("RC Offline on Load");
      }
      
      setIsSubscribed(hasActiveSub);
      
      if (hasActiveSub) {
        setUsageCount(-1); 
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('translator_usage_count')
          .eq('id', user.id)
          .single();
        
        if (profile) setUsageCount(profile.translator_usage_count ?? 0);
      }
    } catch (e: any) { 
      console.log("Status Check Error", e); 
    }
  };

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else { pulseAnim.setValue(1); }
  }, [isRecording, pulseAnim]);

  const handleVoiceToggle = async () => {
    if (!isRecording) {
      await startRecording();
    } else {
      const result = await stopRecording();
      if (result) setText(prev => (prev ? `${prev} ${result}` : result));
    }
  };

  const handleTranslate = async () => {
    if (!text.trim()) {
      Alert.alert(
        "STOP!", 
        "You're firing blanks! We can't weaponize your words if the chamber is empty. Pour your raw emotions into the box first, then let's turn that conflict into a connection.",
        [{ text: "I'm on it!", style: 'cancel' }]
      );
      return;
    }

    Keyboard.dismiss();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Auth Error", "You must be logged in to translate.");
        setLoading(false);
        return;
      }

      let hasAccess = false;
      try {
        const customerInfo = await RC.getCustomerInfo();
        hasAccess = customerInfo.entitlements.active['translator_access'] !== undefined;
      } catch (rcError) {
        console.log("RevenueCat Offline - Defaulting to Free Tier");
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('translator_usage_count')
        .eq('id', user.id)
        .single();
      
      const currentUsage = profile?.translator_usage_count || 0;
    
      if (!hasAccess && currentUsage >= MAX_FREE_SESSIONS) {
        setShowPaywall(true);
        setLoading(false);
        return; 
      }
    
      const { data, error } = await supabase.functions.invoke('translate-message', {
        body: { text, tone }
      });

      if (error) throw error;

      if (data?.translation) {
        setTranslatedText(data.translation);
        
        if (!hasAccess) {
          const newCount = currentUsage + 1;
          await supabase.from('profiles').update({ translator_usage_count: newCount }).eq('id', user.id);
          setUsageCount(newCount);
        }
      } else if (data?.error) {
         Alert.alert("AI Check", data.error);
      }
    } catch (_error: any) { 
      console.error("Translation Error:", _error);
      Alert.alert("Diagnostics", `Claude says: ${_error.message || JSON.stringify(_error)}`);
    } finally { 
      setLoading(false); 
    }
  };

  const copyToClipboard = async (content: string) => {
    const cleanText = content.replace(/["“”]+/g, '').trim();
    await Clipboard.setStringAsync(cleanText);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <SafeAreaView style={styles.container}>
      <TranslatorPaywall isVisible={showPaywall} onClose={() => { setShowPaywall(false); checkStatus(); }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        
        {/* 📱 iPad Fix: Wrapped Header in a Max Width container */}
        <View style={[styles.header, { maxWidth: 650, width: '100%', alignSelf: 'center' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Translator</Text>
            <Text style={styles.subTitle}>
              {usageCount === -1 ? 'UNLIMITED ACCESS' : `Usage: ${usageCount}/${MAX_FREE_SESSIONS} Free`}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* 📱 iPad Fix: Wrapped all main content in a Max Width container */}
          <View style={{ maxWidth: 650, width: '100%', alignSelf: 'center' }}>
            {!translatedText ? (
              <View style={styles.card}>
                <View style={styles.inputContainer}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.inputLabel, { color: '#C41E3A' }]}>
                      {isRecording ? "LISTENING..." : "TRANSLATE RAW EMOTIONS HERE...."}
                    </Text>
                    <Animated.View style={{ transform: [{ scale: isRecording ? pulseAnim : 1 }] }}>
                      <TouchableOpacity 
                        onPress={handleVoiceToggle} 
                        style={[styles.micBtn, isRecording && styles.micBtnActive]}
                      >
                        <MaterialCommunityIcons 
                          name={isRecording ? "microphone" : "microphone-outline"} 
                          size={20} 
                          color={isRecording ? "white" : "#4ECDC4"} 
                        />
                      </TouchableOpacity>
                    </Animated.View>
                  </View>
                  <TextInput
                    style={[styles.input, isRecording && { color: '#f43f5e' }]}
                    placeholder={isRecording ? "" : "Tap mic to speak or type here..."}
                    placeholderTextColor="#475569"
                    multiline value={text} onChangeText={setText} autoCorrect spellCheck autoCapitalize="sentences"
                  />
                </View>

                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 'bold', marginTop: 25, marginBottom: 15, textAlign: 'center' }}>PICK A VIBE</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                  {tones.map((t) => (
                    <TouchableOpacity 
                      key={t.id} 
                      style={[{ width: '47%', marginHorizontal: '1.5%', backgroundColor: '#0f172a', borderRadius: 20, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: 'transparent', minHeight: 135 }, tone === t.id && { borderColor: t.color }]}
                      onPress={() => setTone(t.id)}
                    >
                      <MaterialCommunityIcons name={t.icon} size={24} color={tone === t.id ? t.color : '#475569'} />
                      <Text style={[{ color: '#475569', fontWeight: 'bold', fontSize: 13, marginTop: 8 }, tone === t.id && { color: 'white' }]}>{t.label}</Text>
                      <Text style={{ color: '#64748b', fontSize: 10, textAlign: 'center', marginTop: 6, lineHeight: 14 }}>{t.desc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.translateBtn} onPress={handleTranslate} disabled={loading || transcribing}>
                  {loading || transcribing ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={[styles.translateBtnText, { color: '#FFFFFF' }]}>Change the Vibe</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ marginTop: 0 }}>
                <View style={styles.resultCard}>
                  <Text style={styles.optionLabel}>SEND THIS ONE</Text>
                  <Text style={styles.resultText}>{translatedText}</Text>
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => copyToClipboard(translatedText)}>
                      <MaterialCommunityIcons name="content-copy" size={20} color="white" /><Text style={[styles.actionBtnText, { color: 'white' }]}>Copy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => Share.share({ message: translatedText.replace(/["“”]+/g, '') })}>
                      <MaterialCommunityIcons name="send" size={20} color="white" /><Text style={[styles.actionBtnText, { color: 'white' }]}>Send</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity style={styles.retryBtn} onPress={() => setTranslatedText('')}>
                  <Text style={[styles.retryText, { color: 'white' }]}>Try another message</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}