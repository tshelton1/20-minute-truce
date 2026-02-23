/* components/TranslatorPaywall.tsx */
import * as _React from "react"; 
import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  SafeAreaView,
  ScrollView,
  Linking,
  Platform
} from 'react-native';
import Purchases, { 
  type PurchasesPackage, 
  type PurchasesError, 
  type CustomerInfo,
  type PurchasesOfferings
} from 'react-native-purchases';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// PROD-READY: Interface forces Deno to recognize RevenueCat methods correctly
interface PurchasesInterface {
  isConfigured(): Promise<boolean>;
  configure(config: { apiKey: string }): void;
  getOfferings(): Promise<PurchasesOfferings>;
  purchasePackage(pkg: PurchasesPackage): Promise<{ customerInfo: CustomerInfo }>;
  restorePurchases(): Promise<CustomerInfo>;
}

const RC = Purchases as unknown as PurchasesInterface;

interface PaywallProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function TranslatorPaywall({ isVisible, onClose }: PaywallProps) {
  const [loading, setLoading] = useState(false);
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);

  const TERMS_URL = 'https://gist.githubusercontent.com/tshelton1/059deba6c55a19e2ae50a8fd757cd670/raw/d8532da6e58f5b36d2cd458e86237b2b85c55f53/TermsOfUse.md';
  const PRIVACY_URL = 'https://gist.githubusercontent.com/tshelton1/91548bb0fa53e30177e9b7acb758d5da/raw/7d28903018b338cafc19aa1e3f59ad4d7e36b6e2/PrivacyPolicy.md';

  useEffect(() => {
    if (isVisible) {
      loadOffering();
    }
  }, [isVisible]);

  const loadOffering = async () => {
    try {
      const configured = await RC.isConfigured();
      if (!configured) {
        const apiKey = Platform.select({
          ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
          android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
        });
        
        if (!apiKey) return;
        RC.configure({ apiKey });
      }

      const offerings = await RC.getOfferings();
      
      // FIXED: Added optional chaining to prevent 'possibly undefined/null' errors
      const translatorPkg = offerings.all['translator_offering']?.availablePackages?.[0];
      const currentPkg = offerings.current?.availablePackages?.[0];

      if (translatorPkg) {
        setPkg(translatorPkg);
      } else if (currentPkg) {
        setPkg(currentPkg);
      }
    } catch (e: any) { 
      console.error("RevenueCat Error:", e);
    }
  };

  const handleOpenLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Can't open this link. Please check your browser.");
      }
    } catch (_error: any) {
      Linking.openURL(url).catch(() => {
        Alert.alert("Error", "Unable to load page.");
      });
    }
  };

  const handleUpgrade = async () => {
    if (!pkg) {
      Alert.alert("Service Error", "Please check your internet connection.");
      return;
    }
    setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const purchaseResult = await RC.purchasePackage(pkg);
      const customerInfo = purchaseResult.customerInfo;
      
      if (customerInfo.entitlements.active['translator_access'] !== undefined) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onClose();
      }
    } catch (e: any) {
      const error = e as PurchasesError;
      if (!error.userCancelled) {
        Alert.alert("Transaction Failed", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const customerInfo = await RC.restorePurchases();
      if (customerInfo.entitlements.active['translator_access'] !== undefined) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Success", "Your access has been restored.");
        onClose();
      } else {
        Alert.alert("Notice", "No active subscription found.");
      }
    } catch (e: any) {
      const error = e as Error;
      Alert.alert("Restore Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="heart-broken" size={40} color="#FF6B6B" />
            </View>
            <Text style={styles.title}>STOP HURTING YOUR RELATIONSHIP BY MISTAKE</Text>
            <Text style={styles.subtitle}>
              One mean text can cause a long fight...or worse...a breakup! Don't let your angry feelings get in the way of your love. Start sending better messages today.
            </Text>
          </View>

          <View style={styles.features}>
            <View style={styles.featureRow}>
              <MaterialCommunityIcons name="chat-processing" size={32} color="#4ade80" />
              <View style={styles.featureTextColumn}>
                <Text style={styles.featureTitle}>Fix Your Words</Text>
                <Text style={styles.featureDesc}>Turn angry thoughts into kind words so people really listen to you.</Text>
              </View>
            </View>

            <View style={styles.featureRow}>
              <MaterialCommunityIcons name="heart-pulse" size={32} color="#f43f5e" />
              <View style={styles.featureTextColumn}>
                <Text style={styles.featureTitle}>Unlimited Help</Text>
                <Text style={styles.featureDesc}>Get help as many times as you need to fix a fight or a bad mood.</Text>
              </View>
            </View>

            <View style={styles.featureRow}>
              <MaterialCommunityIcons name="auto-fix" size={32} color="#a855f7" />
              <View style={styles.featureTextColumn}>
                <Text style={styles.featureTitle}>Secret Superpower</Text>
                <Text style={styles.featureDesc}>No one will know you had help. They will just see that you are being nicer or funnier.</Text>
              </View>
            </View>
          </View>

          <View style={styles.purchaseContainer}>
            <TouchableOpacity style={styles.upgradeBtn} onPress={handleUpgrade} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <Text style={styles.upgradeBtnText}>
                  GET UNLIMITED HELP NOW — {pkg ? pkg.product.priceString : "$6.99"}
                </Text>
              )}
            </TouchableOpacity>
            <Text style={styles.billingNote}>Cancel any time. Being kind lasts forever.</Text>
          </View>

          <TouchableOpacity style={styles.maybeLater} onPress={onClose} disabled={loading}>
            <Text style={styles.maybeLaterText}>No thanks, I'll just keep sending mean texts</Text>
          </TouchableOpacity>

          <View style={styles.footerLegal}>
            <View style={styles.legalLinksRow}>
              <TouchableOpacity onPress={handleRestore}><Text style={styles.legalLink}>Restore</Text></TouchableOpacity>
              <Text style={styles.divider}>•</Text>
              <TouchableOpacity onPress={() => handleOpenLink(TERMS_URL)}><Text style={styles.legalLink}>Terms</Text></TouchableOpacity>
              <Text style={styles.divider}>•</Text>
              <TouchableOpacity onPress={() => handleOpenLink(PRIVACY_URL)}><Text style={styles.legalLink}>Privacy</Text></TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { paddingHorizontal: 25, paddingVertical: 20, alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 20 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 107, 107, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center', letterSpacing: 0.5, lineHeight: 30 },
  subtitle: { color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 15, lineHeight: 20 },
  features: { width: '100%', marginBottom: 30, gap: 15 },
  featureRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    gap: 15, 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    padding: 18, 
    borderRadius: 20 
  },
  featureTextColumn: { flex: 1, flexShrink: 1 },
  featureTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  featureDesc: { color: '#94a3b8', fontSize: 13, marginTop: 4, lineHeight: 18 },
  purchaseContainer: { width: '100%', alignItems: 'center' },
  upgradeBtn: { width: '100%', backgroundColor: '#4ECDC4', padding: 22, borderRadius: 18, alignItems: 'center', shadowColor: '#4ECDC4', shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 },
  upgradeBtnText: { color: '#0f172a', fontWeight: '900', fontSize: 15, textAlign: 'center' },
  billingNote: { color: '#475569', fontSize: 11, marginTop: 15, fontWeight: '600' },
  maybeLater: { padding: 15, marginTop: 15 },
  maybeLaterText: { color: '#64748b', fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  footerLegal: { marginTop: 40, alignItems: 'center', width: '100%' },
  legalLinksRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  legalLink: { color: '#475569', fontSize: 11, fontWeight: '600' },
  divider: { color: '#334155', marginHorizontal: 15 }
});