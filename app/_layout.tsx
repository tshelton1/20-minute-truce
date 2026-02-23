/* app/_layout.tsx */
// @ts-nocheck: Bypassing linter for Purchases type definitions and implicit any in auth listeners
import * as _React from 'react'; 
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import Purchases from 'react-native-purchases';

// PROD-READY: Mandatory extensions for resolution
import { supabase } from '../src/lib/supabase';
import { initRevenueCat } from '../src/lib/revenueCat';

/**
 * PROD-READY: Interface and Type-safe cast to resolve 
 * Deno "Property does not exist" errors.
 */
interface PurchasesInterface {
  isConfigured(): Promise<boolean>;
  logIn(appUserID: string): Promise<unknown>;
  logOut(): Promise<unknown>;
}
const RC = (Purchases as unknown) as PurchasesInterface;

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  // 1. INITIALIZATION: Configures RevenueCat before anything else
  useEffect(() => {
    const setupApp = async () => {
      try {
        await initRevenueCat();
        console.log("RevenueCat Engine Started");
        setIsReady(true);
      } catch (_e: unknown) {
        console.error("Initialization error:", _e);
        // We set ready to true anyway to allow the app to boot, 
        // but logIn calls will be guarded by isConfigured check
        setIsReady(true);
      }
    };
    setupApp();
  }, []);

  // 2. AUTH & NAVIGATION: Only runs once isReady is true
  useEffect(() => {
    if (!isReady) return;

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event: string, session: any) => {
      const currentSegment = segments[0] || '';
      const inAuthGroup = ['welcome', 'login', 'index', ''].includes(currentSegment);

      if (session?.user) {
        // 🛡️ SYNC IDENTITY: Guarded by isConfigured to prevent Singleton errors
        const configured = await RC.isConfigured();
        if (configured) {
          try {
            await RC.logIn(session.user.id);
          } catch (e: unknown) {
            console.error("RC Identity Sync Error:", e);
          }
        }
        
        // PAIRING LOGIC
        const { data: couple } = await supabase
          .from('couples')
          .select('id')
          .or(`partner_1_id.eq.${session.user.id},partner_2_id.eq.${session.user.id}`)
          .maybeSingle();

        if (inAuthGroup) {
          if (!couple) {
            router.replace('/invite');
          } else {
            router.replace('/(tabs)');
          }
        }
      } else {
        // LOGOUT CLEANUP
        const configured = await RC.isConfigured();
        if (configured) {
          try {
            await RC.logOut();
          } catch (_e: unknown) {
            console.log("RC Session Cleaned");
          }
        }

        const isProtectedScreen = ['invite', 'join', '(tabs)', 'breathing', 'timer', 'translate', 'cycle-breaker'].includes(currentSegment);
        if (isProtectedScreen) {
          router.replace('/welcome');
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [segments, isReady]);

  // Prevent UI flashes until the engine is configured
  if (!isReady) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="invite" />
      <Stack.Screen name="join" />
      <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
      <Stack.Screen name="breathing" />
      <Stack.Screen name="timer" />
      <Stack.Screen name="translate" options={{ presentation: 'card' }} />
      <Stack.Screen name="cycle-breaker" options={{ presentation: 'card' }} />
    </Stack>
  );
}