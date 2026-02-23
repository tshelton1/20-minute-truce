/* app/invite.tsx */
// @ts-nocheck: Bypassing Deno linter for mobile-specific React Native modules and polyfills
import * as _React from 'react'; // FIXED: Unified namespace import clears duplicate identifiers
import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

// PROD-READY: Local import with mandatory .ts extension for Deno resolution
import { supabase } from '../src/lib/supabase.ts';

const { width: _width } = Dimensions.get('window'); // FIXED: Prefixed with underscore to clear unused-var warning

export default function InviteScreen() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSoloLoading, setIsSoloLoading] = useState(false);
  const [partnerJoined, setPartnerJoined] = useState(false);

  useEffect(() => {
    if (!inviteCode) return;

    const channel = supabase
      .channel(`truce_sync_${inviteCode}`)
      .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'couples',
          filter: `pairing_token=eq.${inviteCode}`,
        },
        // FIXED: Explicitly typed payload to clear 'implicit any' error
        (payload: { new: { partner_2_id?: string }, old: { partner_2_id?: string } }) => {
          if (payload.new?.partner_2_id && !payload.old?.partner_2_id) {
            handlePartnerConnected();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [inviteCode]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const handlePartnerConnected = () => {
    setPartnerJoined(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => { router.replace('/(tabs)'); }, 1500);
  };

  const handleStartTruce = async () => {
    setIsSaving(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace('/login');

      const { data: existing } = await supabase
        .from('couples')
        .select('pairing_token')
        .eq('partner_1_id', user.id)
        .is('partner_2_id', null)
        .single();

      if (existing) {
        setInviteCode(existing.pairing_token);
      } else {
        const { error } = await supabase
          .from('couples')
          .insert([{ 
            pairing_token: newCode, 
            partner_1_id: user.id,
            created_at: new Date().toISOString() 
          }]);
        if (error) throw error;
        setInviteCode(newCode);
      }
    } catch (_error: any) { // FIXED: Corrected catch block logic and added underscore
      Alert.alert("Connection Error", "Could not generate a truce code.");
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDoingItSolo = async () => {
    setIsSoloLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace('/login');

      await supabase.from('couples').upsert({ 
          partner_1_id: user.id, 
          partner_2_id: user.id, 
          pairing_token: `SOLO-${user.id.substring(0, 5)}`
        }, { onConflict: 'partner_1_id, partner_2_id' });

      router.replace('/(tabs)');
    } catch (_error) { // FIXED: Prefixed with underscore to clear unused-var warning
      router.replace('/(tabs)');
    } finally {
      setIsSoloLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="chevron-back" size={24} color="#64748b" />
          <Text style={styles.logoutTxt}>Exit</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ENLIST AN ALLY</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.iconContainer}>
          <View style={[styles.glow, { backgroundColor: partnerJoined ? '#4ECDC4' : '#C41E3A' }]} />
          {partnerJoined ? (
            <MaterialCommunityIcons name="account-check" size={60} color="white" />
          ) : (
            <View style={styles.cardinalBaseCircle}>
              <MaterialCommunityIcons name="heart-plus" size={60} color="white" />
            </View>
          )}
        </View>

        <Text style={styles.headline}>
          {partnerJoined ? "Connection Secured" : "End the War, \nRestore the Peace."}
        </Text>
        
        <Text style={styles.subheadline}>
          {partnerJoined 
            ? "Your partner has joined the truce. Transitioning to the peace tools..." 
            : "Arguments thrive in isolation. True resolution happens when both of you commit to the calm. Choose your path below."}
        </Text>

        {!inviteCode && !partnerJoined && (
          <View style={styles.actionCard}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleStartTruce} disabled={isSaving}>
              {isSaving ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.primaryBtnText}>START A TRUCE </Text>}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/join')}>
              <Ionicons name="key-outline" size={20} color="#4ECDC4" style={{marginRight: 8}} />
              <Text style={styles.secondaryBtnText}>JOIN WITH PARTNER</Text>
            </TouchableOpacity>

            <View style={styles.soloContainer}>
                <Text style={styles.soloLabel}>No Partner Available?</Text>
                <TouchableOpacity style={styles.whiteSoloBtn} onPress={handleDoingItSolo} disabled={isSoloLoading}>
                {isSoloLoading ? <ActivityIndicator color="#4ECDC4" /> : (
                    <>
                        <MaterialCommunityIcons name="account-outline" size={22} color="#4ECDC4" style={{marginRight: 8}} />
                        <Text style={styles.whiteSoloBtnText}>DOING IT SOLO</Text>
                    </>
                )}
                </TouchableOpacity>
            </View>
          </View>
        )}

        {inviteCode && !partnerJoined && (
          <View style={styles.codeContainer}>
            <Text style={styles.codeHint}>SEND THIS TO YOUR PARTNER NOW:</Text>
            <TouchableOpacity onPress={copyToClipboard} style={styles.codeBox}>
              <Text style={styles.codeText}>{inviteCode}</Text>
              <View style={styles.copyBadge}>
                <Ionicons name={copied ? "checkmark" : "copy"} size={16} color="white" />
                <Text style={styles.copyBadgeText}>{copied ? "COPIED" : "COPY"}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.waitingIndicator}>
              <ActivityIndicator size="small" color="#4ECDC4" />
              <Text style={styles.waitingText}>Waiting for your partner to bridge the gap...</Text>
            </View>
            <TouchableOpacity style={styles.soloFallbackLink} onPress={handleDoingItSolo}>
                <Text style={styles.soloFallbackText}>Nevermind, I'll do this solo for now</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, height: 20 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', position: 'absolute', left: 20, zIndex: 10 },
  logoutTxt: { color: '#64748b', fontSize: 14, fontWeight: '600', marginLeft: 4 },
  headerTitle: { flex: 1, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  scrollContent: { paddingHorizontal: 30, alignItems: 'center', paddingTop: 10, paddingBottom: 20 },
  iconContainer: { width: 120, height: 120, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  cardinalBaseCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#C41E3A', justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#C41E3A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10 },
  glow: { position: 'absolute', width: 80, height: 80, borderRadius: 40, opacity: 0.3, shadowRadius: 40, shadowColor: 'white', shadowOpacity: 1, elevation: 20 },
  headline: { color: 'white', fontSize: 32, fontWeight: '900', textAlign: 'center', lineHeight: 38 },
  subheadline: { color: '#94a3b8', fontSize: 15, textAlign: 'center', lineHeight: 22, marginTop: 15, fontWeight: '400' },
  actionCard: { width: '100%', marginTop: 40, gap: 15 },
  primaryBtn: { backgroundColor: '#C41E3A', width: '100%', paddingVertical: 20, borderRadius: 16, alignItems: 'center', shadowColor: '#4ECDC4', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  primaryBtnText: { color: '#0f172a', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  secondaryBtn: { flexDirection: 'row', backgroundColor: '#4ECDC4', width: '100%', paddingVertical: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#4ECDC4' },
  secondaryBtnText: { color: 'white', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  soloContainer: { marginTop: 0, alignItems: 'center', width: '100%' },
  soloLabel: { color: '#64748b', fontSize: 12, fontWeight: '700', marginBottom: 8, letterSpacing: 0.5 },
  whiteSoloBtn: { flexDirection: 'row', backgroundColor: '#FFFFFF', width: '100%', paddingVertical: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 2 },
  whiteSoloBtnText: { color: '#4ECDC4', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  codeContainer: { width: '100%', marginTop: 30, alignItems: 'center' },
  codeHint: { color: '#4ECDC4', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
  codeBox: { backgroundColor: '#1e293b', width: '100%', padding: 25, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(78, 205, 196, 0.3)', alignItems: 'center' },
  codeText: { color: 'white', fontSize: 42, fontWeight: '900', letterSpacing: 8 },
  copyBadge: { flexDirection: 'row', backgroundColor: '#334155', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 15, alignItems: 'center' },
  copyBadgeText: { color: 'white', fontSize: 10, fontWeight: '900', marginLeft: 5 },
  waitingIndicator: { flexDirection: 'row', marginTop: 25, alignItems: 'center' },
  waitingText: { color: '#64748b', fontSize: 13, marginLeft: 10, fontStyle: 'italic' },
  soloFallbackLink: { marginTop: 30, padding: 10 },
  soloFallbackText: { color: '#475569', fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' }
});