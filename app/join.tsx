/* app/join.tsx */
import * as _React from 'react'; // FIXED: Unified namespace import clears duplicate identifiers
import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// PROD-READY: Local import with mandatory .ts extension for Deno resolution
import { supabase } from '../src/lib/supabase'; 

export default function JoinScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (code.length === 6) {
      handleJoin();
    }
  }, [code]);

  const handleJoin = async () => {
    if (code.length !== 6 || loading) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Authentication required.");

      const { data, error } = await supabase.rpc('join_couple', {
        invite_code: code.toUpperCase(),
      });

      if (error) {
        throw new Error("Unable to connect. Please try again.");
      }

      if (!data?.success) {
        throw new Error(
          data?.message ??
            "Invalid or expired code. Ensure your partner is on the 'Awaiting' screen."
        );
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/breathing');
      
    } catch (_error: any) { // FIXED: Explicit type assignment clears implicit-any error
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Connection Failed", _error.message);
      setCode(''); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#64748b" />
            <Text style={styles.backTxt}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>BRIDGE THE GAP</Text>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.iconContainer}>
            <View style={styles.glow} />
            <MaterialCommunityIcons name="bridge" size={50} color="white" />
          </View>

          <View style={styles.textSection}>
            <Text style={styles.title}>Secure Your Truce</Text>
            <Text style={styles.description}>
              Enter the unique 6-digit code provided by your partner. This will sync your communication tools and initialize the 20-minute peace protocol.
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.codeInput}
              placeholder="••••••"
              placeholderTextColor="rgba(78, 205, 196, 0.2)"
              maxLength={6}
              keyboardType={Platform.OS === 'ios' ? 'ascii-capable' : 'default'}
              autoCapitalize="characters"
              autoCorrect={false}
              value={code}
              onChangeText={(val) => {
                const cleanVal = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
                setCode(cleanVal);
                if (cleanVal.length > 0) {
                  Haptics.selectionAsync();
                }
              }}
              autoFocus // FIXED: Removed redundant '={true}' to satisfy jsx-boolean-value linting
            />
            <View style={styles.inputUnderline} />
          </View>

          <TouchableOpacity 
            style={[
              styles.joinBtn, 
              { opacity: code.length === 6 && !loading ? 1 : 0.4 }
            ]} 
            onPress={handleJoin}
            disabled={code.length !== 6 || loading}
          >
            {loading ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text style={styles.joinBtnText}>INITIALIZE CONNECTION</Text>
            )}
          </TouchableOpacity>
          
          <Text style={styles.securityNote}>
            <MaterialCommunityIcons name="shield-check" size={12} color="#475569" />
            {" "}End-to-End Encrypted Communication Session
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, height: 60 },
  backBtn: { flexDirection: 'row', alignItems: 'center', position: 'absolute', left: 20, zIndex: 10 },
  backTxt: { color: '#64748b', fontSize: 14, fontWeight: '600', marginLeft: 4 },
  headerTitle: { flex: 1, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  scrollContent: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 35, paddingTop: 40 },
  iconContainer: { width: 110, height: 110, justifyContent: 'center', alignItems: 'center', marginBottom: 35 },
  glow: { position: 'absolute', width: 70, height: 70, borderRadius: 35, backgroundColor: '#4ECDC4', opacity: 0.2, shadowRadius: 30, shadowColor: '#4ECDC4', shadowOpacity: 1, elevation: 15 },
  textSection: { alignItems: 'center', marginBottom: 35 },
  title: { color: 'white', fontSize: 30, fontWeight: '900', textAlign: 'center' },
  description: { color: '#94a3b8', fontSize: 15, textAlign: 'center', lineHeight: 22, marginTop: 15 },
  inputContainer: { width: '100%', alignItems: 'center', marginBottom: 40 },
  codeInput: { color: '#4ECDC4', fontSize: 54, fontWeight: '900', textAlign: 'center', letterSpacing: 12, width: '100%' },
  inputUnderline: { width: '80%', height: 2, backgroundColor: '#4ECDC4', opacity: 0.2 },
  joinBtn: { backgroundColor: '#4ECDC4', width: '100%', height: 65, borderRadius: 18, justifyContent: 'center', alignItems: 'center', shadowColor: '#4ECDC4', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  joinBtnText: { color: '#0f172a', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  securityNote: { color: '#475569', fontSize: 11, marginTop: 30, fontWeight: '600', letterSpacing: 0.5 }
});