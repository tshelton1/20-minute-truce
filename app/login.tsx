/* app/login.tsx */
import * as _React from 'react'; 
import { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// PROD-READY: Removed .ts extension. Metro bundler requires extensionless imports for local files.
import { supabase } from '../src/lib/supabase';

export default function AuthScreen() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleAuth() {
    const cleanEmail = email.trim().toLowerCase(); 
    
    if (!cleanEmail || !password.trim()) {
      Alert.alert("Required", "Please enter both your email and password.");
      return;
    }

    setLoading(true);
    
    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          Alert.alert("Error", "Passwords do not match.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({ 
          email: cleanEmail, 
          password 
        });

        if (error) throw error;

        if (!data?.session) {
          Alert.alert("Check your inbox", "We sent a confirmation link to your email.");
          setIsSignUp(false);
          setLoading(false); 
        } else {
          router.replace('/invite');
        }

      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ 
          email: cleanEmail, 
          password 
        });

        if (error) throw error;
        
        // 🛡️ THE FIX: Take control back. Explicitly check status and route them immediately.
        if (data?.user) {
          const { data: couple } = await supabase
            .from('couples')
            .select('id')
            .or(`partner_1_id.eq.${data.user.id},partner_2_id.eq.${data.user.id}`)
            .maybeSingle();

          if (couple) {
            router.replace('/(tabs)');
          } else {
            router.replace('/invite');
          }
        }
      }
    } catch (_error: any) { 
      // Changed from console.error to console.log so Expo stops throwing red screens!
      console.log("Auth Error:", _error.message); 
      let friendlyMessage = _error.message;
      
      if (_error.message.includes("Invalid login credentials")) {
        friendlyMessage = "Incorrect email or password. Please try again.";
      } else if (_error.message.includes("Network request failed")) {
        friendlyMessage = "Connection error. Please check your internet.";
      }

      // DO NOT show an alert if it was a background auto-login failure 
      // after a password reset, just kill the spinner silently.
      if (!friendlyMessage.includes("Invalid login credentials") || email !== '') {
        Alert.alert("Authentication Failed", friendlyMessage);
      }
    } finally {
      setLoading(false); 
    }
  }


  // NEW: Password Reset Function
  async function handlePasswordReset() {
    const cleanEmail = email.trim().toLowerCase(); 
    
    if (!cleanEmail) {
      Alert.alert("Required", "Please enter your email address above so we know where to send the code.");
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (error) throw error;

      Alert.alert("Check your inbox", "We just sent you a 8-digit reset code!");
      router.push(`/reset-password?email=${encodeURIComponent(cleanEmail)}`);
      
    } catch (_error: any) {
      Alert.alert("Error", _error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.inner}
      >
        <View style={styles.header}>
          <Text style={styles.logoText}>20 MINUTE TRUCE</Text>
          <Text style={styles.subTitle}>
            {isSignUp ? 'Create your peace sanctuary' : 'Welcome back to the calm'}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="email@example.com"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor="rgba(255,255,255,0.3)"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="oneTimeCode" // Kills the yellow Apple AutoFill
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color="#4ECDC4" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {isSignUp && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="rgba(255,255,255,0.3)"
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="oneTimeCode" // Kills the yellow Apple AutoFill
              />
            </View>
          )}

          {!isSignUp && (
            <TouchableOpacity 
              style={styles.forgotBtn}
              onPress={handlePasswordReset}
              disabled={loading}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.primaryBtn} 
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.footerBtn} 
          onPress={() => setIsSignUp(!isSignUp)}
        >
          <Text style={styles.footerText}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <Text style={styles.footerAction}>{isSignUp ? 'Sign In' : 'Create One'}</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  inner: { flex: 1, paddingHorizontal: 30, justifyContent: 'center' },
  header: { marginBottom: 40, alignItems: 'center' },
  logoText: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: 2, marginBottom: 8, textAlign: 'center' },
  subTitle: { color: '#94a3b8', fontSize: 16, fontWeight: '300', textAlign: 'center', letterSpacing: 0.5 },
  form: { width: '100%' },
  inputGroup: { marginBottom: 20 },
  label: { color: '#4ECDC4', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', fontSize: 16 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  passwordInput: { flex: 1, paddingVertical: 16, color: '#fff', fontSize: 16 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { color: '#94a3b8', fontSize: 14, letterSpacing: 0.5 },
  primaryBtn: { backgroundColor: '#4ECDC4', borderRadius: 12, padding: 18, alignItems: 'center', shadowColor: '#4ECDC4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, marginTop: 10 },
  primaryBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 16, letterSpacing: 1 },
  footerBtn: { marginTop: 30, alignItems: 'center' },
  footerText: { color: '#94a3b8', fontSize: 14, letterSpacing: 0.5 },
  footerAction: { color: '#4ECDC4', fontWeight: '700' },
});