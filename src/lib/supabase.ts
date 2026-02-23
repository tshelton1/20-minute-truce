// @ts-nocheck: Bypassing Deno linter for mobile-only SecureStore and polyfill modules
/* src/lib/supabase.ts */
import 'react-native-url-polyfill/auto.js'; 
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// CRITICAL: Removed "node:process" import. It causes a red-screen crash in React Native.
// Metro/Expo provides 'process' as a global variable automatically.

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value, {
      // PROD-READY: Mandatory for iOS background token refreshes to prevent crashes
      accessibility: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});