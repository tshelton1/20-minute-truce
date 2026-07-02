/* app/reset-password.tsx */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../src/lib/supabase';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false); 

  async function handleSaveNewPassword() {
    if (loading) return;

    const cleanCode = code.trim();
    const cleanPassword = password.trim();
    const cleanEmail = String(email).trim();

    console.log("=== BYPASS RESET INITIATED ===");

    if (!cleanCode || !cleanPassword || !confirmPassword) {
      return Alert.alert("Required", "Please fill out all fields.");
    }

    if (cleanPassword !== confirmPassword.trim()) {
      return Alert.alert("Error", "Passwords do not match.");
    }

    setLoading(true);

    try {
      console.log("1. Verifying OTP...");
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanCode,
        type: 'recovery',
      });

      if (verifyError) throw verifyError;
      
      console.log("2. OTP Verified! Getting temporary session token...");
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Could not securely connect. Please try again.");
      }

      console.log("3. BYPASSING SDK: Sending raw API request directly to server...");
      
      // 🚀 THE NUCLEAR BYPASS 🚀
      // This completely ignores the Supabase SDK and its broken storage locks.
      // We are forcing the database to update the password directly.
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
        },
        body: JSON.stringify({ password: cleanPassword })
      });

      if (!response.ok) {
        throw new Error("Failed to update password on the server.");
      }

      console.log("4. Password forcefully updated via API!");

      console.log("5. Signing out ghost session...");
      await supabase.auth.signOut();

      setLoading(false);

      setTimeout(() => {
        Alert.alert("Success!", "Your password has been securely updated.", [
          { text: "Log In", onPress: () => router.replace('/login') }
        ]);
      }, 500);
      
    } catch (_error: any) {
      setLoading(false);
      console.error("Caught Error:", _error.message);
      Alert.alert("Error", _error?.message || "Something went wrong. Please try again.");
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.logoText}>SECURE RESET</Text>
          <Text style={styles.subTitle}>Enter the 8-digit code we emailed you</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>8-Digit Code</Text>
            <TextInput
              style={styles.input}
              placeholder="12345678"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="number-pad"
              textContentType="oneTimeCode" 
              value={code}
              onChangeText={setCode}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor="rgba(255,255,255,0.3)"
                secureTextEntry={!showPassword}
                textContentType="password" 
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#4ECDC4" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="rgba(255,255,255,0.3)"
              secureTextEntry={!showPassword}
              textContentType="password" 
              autoCapitalize="none"
              autoCorrect={false}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          <TouchableOpacity 
            style={[styles.primaryBtn, loading && { opacity: 0.7 }]} 
            onPress={handleSaveNewPassword} 
            disabled={loading} 
          >
            {loading ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.primaryBtnText}>Save Password</Text>}
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.footerBtn} onPress={() => router.replace('/login')} disabled={loading}>
          <Text style={styles.footerText}>Nevermind, take me back to <Text style={styles.footerAction}>Sign In</Text></Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  inner: { flex: 1, paddingHorizontal: 30, justifyContent: 'center' },
  header: { marginBottom: 40, alignItems: 'center' },
  logoText: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: 2, marginBottom: 8, textAlign: 'center' },
  subTitle: { color: '#94a3b8', fontSize: 16, fontWeight: '300', textAlign: 'center' },
  form: { width: '100%' },
  inputGroup: { marginBottom: 20 },
  label: { color: '#4ECDC4', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', fontSize: 16 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  passwordInput: { flex: 1, paddingVertical: 16, color: '#fff', fontSize: 16 },
  primaryBtn: { backgroundColor: '#4ECDC4', borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 10 },
  primaryBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 16, letterSpacing: 1 },
  footerBtn: { marginTop: 30, alignItems: 'center' },
  footerText: { color: '#94a3b8', fontSize: 14 },
  footerAction: { color: '#4ECDC4', fontWeight: '700' },
});