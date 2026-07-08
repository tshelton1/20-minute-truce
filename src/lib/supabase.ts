// @ts-nocheck: Bypassing Deno linter for mobile-only SecureStore and polyfill modules
/* src/lib/supabase.ts */
import 'react-native-url-polyfill/auto.js'; 
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureSupabaseAuthRecovery } from './authSession';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage, // <-- The official, limit-free storage!
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

configureSupabaseAuthRecovery(supabase);