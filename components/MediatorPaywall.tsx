/* components/MediatorPaywall.tsx */
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
import Constants from 'expo-constants'; 

// PROD-READY: Interface to solve "Property does not exist" errors in Deno
interface PurchasesInterface {
  isConfigured(): Promise<boolean>;
  configure(config: { apiKey: string }): void;
  getOfferings(): Promise<PurchasesOfferings>;
  purchasePackage(pkg: PurchasesPackage): Promise<{ customerInfo: CustomerInfo }>;
  restorePurchases(): Promise<CustomerInfo>;
}

const RC = Purchases as unknown as PurchasesInterface;

interface Props {
  isVisible: boolean;
  onClose: () => void;
}

export default function MediatorPaywall({ isVisible, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  
  const TERMS_URL = 'https://gist.githubusercontent.com/tshelton1/059deba6c55a19e2ae50a8fd757cd670/raw/d8532da6e58f5b36d2cd458e86237b2b85c55f53/TermsOfUse.md';
  const PRIVACY_URL = 'https://gist.githubusercontent.com/tshelton1/91548bb0fa53e30177e9b7acb758d5da/raw/7d28903018b338cafc19aa1e3f59ad4d7e36b6e2/PrivacyPolicy.md';
  const UNIFORM_SPACING = 0.5;

  useEffect(() => {
    if (isVisible) {
      loadOffering();
    }
  }, [isVisible]);

  const loadOffering = async () => {
    try {
      if (Constants.appOwnership === 'expo') {
        console.log("ℹ️ RevenueCat: Running in Expo Go. Skipping native store configuration.");
        return; 
      }

      const configured = await RC.isConfigured();
      if (!configured) {
        const apiKey = Platform.OS === 'ios' 
          ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY 
          : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
        
        if (!apiKey) {
          console.error("RevenueCat API Key missing");
          return;
        }
        RC.configure({ apiKey: apiKey as string });
      }

      const offerings = await RC.getOfferings();
      const mediatorPkg = offerings.all['mediator_offering']?.availablePackages?.[0];
      const currentPkg = offerings.current?.availablePackages?.[0];

      if (mediatorPkg) {
        setPkg(mediatorPkg);
      } else if (currentPkg) {
        setPkg(currentPkg);
      }
    } catch (e: any) {
      console.error("RevenueCat Offering Load Error:", e);
    }
  };

  const handlePurchase = async () => {
    if (__DEV__ && Constants.appOwnership === 'expo') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Alert.alert("Development Mode", "Native store features are disabled in Expo Go. Unlocking UI for testing.");
      onClose();
      return;
    }

    if (!pkg) {
      Alert.alert("Service Error", "Please check your internet connection.");
      return;
    }

    setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const purchaseResult = await RC.purchasePackage(pkg);
      const customerInfo = purchaseResult.customerInfo;
      
      if (customerInfo.entitlements.active['mediator_access'] !== undefined) {
        // 🛡️ FIXED: Corrected case to NotificationFeedbackType
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
      if (customerInfo.entitlements.active['mediator_access'] !== undefined) {
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
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeContainer}>
          <View style={styles.content}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <View style={styles.header}>
                <View style={styles.emergencyBadge}>
                  <MaterialCommunityIcons name="shield-check" size={16} color="#0f172a" />
                  <Text style={styles.emergencyBadgeText}>PEACE COMMAND CENTER</Text>
                </View>

                <Text style={[styles.title, { letterSpacing: UNIFORM_SPACING }]}>
                  STOP THE FIGHTS BEFORE THEY BREAK YOUR HOME
                </Text>
                
                <Text style={[styles.subText, { letterSpacing: UNIFORM_SPACING }]}>
                  Fights are scary. They hurt your heart and ruin your day. Stop guessing why you are mad and start fixing your love right now.
                </Text>
              </View>

              <View style={styles.painPointList}>
                <View style={styles.painItem}>
                  <View style={[styles.iconContainer, { backgroundColor: 'rgba(74, 222, 128, 0.15)' }]}>
                    <MaterialCommunityIcons name="whistle-outline" size={22} color="#4ade80" />
                  </View>
                  <View style={styles.painContent}>
                    <Text style={[styles.painTitle, { color: '#4ade80' }]}>A REFEREE IN YOUR POCKET</Text>
                    <Text style={styles.painDesc}>I help you play fair so your small fights don't turn into big breakups.</Text>
                  </View>
                </View>
                
                <View style={styles.painItem}>
                  <View style={[styles.iconContainer, { backgroundColor: 'rgba(250, 204, 21, 0.15)' }]}>
                    <MaterialCommunityIcons name="map-search-outline" size={22} color="#facc15" />
                  </View>
                  <View style={styles.painContent}>
                    <Text style={[styles.painTitle, { color: '#facc15' }]}>A SECRET MAP OF TRAPS</Text>
                    <Text style={styles.painDesc}>I see exactly why you are fighting and show you the way out of the trap.</Text>
                  </View>
                </View>

                <View style={styles.painItem}>
                  <View style={[styles.iconContainer, { backgroundColor: 'rgba(244, 63, 94, 0.15)' }]}>
                    <MaterialCommunityIcons name="heart-flash" size={22} color="#f43f5e" />
                  </View>
                  <View style={styles.painContent}>
                    <Text style={[styles.painTitle, { color: '#f43f5e' }]}>FIX THE MOOD FAST</Text>
                    <Text style={styles.painDesc}>Don't wait for a Therapist. I help you stop the anger and the fighting today.</Text>
                  </View>
                </View>
              </View>

              <View style={styles.priceComparisonContainer}>
                <Text style={styles.closingCall}>Therapy costs $200 for one hour.</Text>
                <Text style={styles.divorceWarning}>Divorce costs half of everything you own.</Text>
                <Text style={styles.peaceHighlight}>
                   Your peace is only {pkg ? pkg.product.priceString : "$6.99"}/mo
                </Text>
              </View>

              <TouchableOpacity style={styles.premiumBtn} onPress={handlePurchase} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#0f172a" />
                ) : (
                  <View style={styles.btnContent}>
                    <Text style={styles.premiumBtnText}>SAVE MY LOVE NOW</Text>
                    <Text style={styles.subBtnText}>{pkg ? pkg.product.priceString : "$6.99"} — CHEAPER THAN LUNCH</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.billingNote}>Cancel anytime. Being happy is worth it.</Text>
              
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeText}>No, I'll just keep fighting on my own</Text>
              </TouchableOpacity>

              <View style={styles.footerLegal}>
                <View style={styles.legalLinksRow}>
                  <TouchableOpacity onPress={handleRestore}><Text style={styles.legalLink}>Restore</Text></TouchableOpacity>
                  <Text style={styles.divider}>•</Text>
                  <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}><Text style={styles.legalLink}>Terms</Text></TouchableOpacity>
                  <Text style={styles.divider}>•</Text>
                  <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}><Text style={styles.legalLink}>Privacy</Text></TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.98)' },
  safeContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  content: { backgroundColor: '#1e293b', borderRadius: 32, borderWidth: 1, borderColor: '#4ECDC4', overflow: 'hidden' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 30, paddingTop: 25, alignItems: 'center' },
  header: { alignItems: 'center', width: '100%' },
  emergencyBadge: { flexDirection: 'row', backgroundColor: '#4ECDC4', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, alignItems: 'center', marginBottom: 12 },
  emergencyBadgeText: { color: '#0f172a', fontSize: 10, fontWeight: '900', marginLeft: 5, letterSpacing: 1 },
  title: { color: 'white', fontSize: 22, fontWeight: '900', textAlign: 'center', lineHeight: 28 },
  subText: { color: '#cbd5e1', fontSize: 14, textAlign: 'center', marginTop: 12, lineHeight: 20 },
  painPointList: { width: '100%', marginTop: 20, gap: 10 },
  painItem: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#0f172a', padding: 16, borderRadius: 20, gap: 14 },
  iconContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  painContent: { flex: 1, flexShrink: 1 },
  painTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  painDesc: { color: 'white', fontSize: 13, marginTop: 4, lineHeight: 18 },
  priceComparisonContainer: { marginTop: 25, alignItems: 'center', width: '100%' },
  closingCall: { color: '#94a3b8', fontSize: 12, textAlign: 'center' },
  divorceWarning: { color: '#f87171', fontWeight: '700', fontSize: 12, textAlign: 'center', marginTop: 2 },
  peaceHighlight: { color: 'white', fontWeight: '800', fontSize: 15, textAlign: 'center', marginTop: 5 },
  premiumBtn: { backgroundColor: '#4ECDC4', width: '100%', paddingVertical: 18, borderRadius: 100, marginTop: 20, alignItems: 'center', shadowColor: '#4ECDC4', shadowOpacity: 0.3, shadowRadius: 10 },
  btnContent: { alignItems: 'center' },
  premiumBtnText: { color: '#0f172a', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  subBtnText: { color: '#0f172a', fontWeight: '700', fontSize: 10, marginTop: 2, opacity: 0.8 },
  billingNote: { color: '#475569', fontSize: 10, marginTop: 10 },
  closeBtn: { marginTop: 20 },
  closeText: { color: '#64748b', fontSize: 13, textAlign: 'center', textDecorationLine: 'underline', fontWeight: '700' },
  footerLegal: { marginTop: 35, alignItems: 'center', width: '100%', opacity: 0.8 },
  legalLinksRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  legalLink: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
  divider: { color: '#334155', marginHorizontal: 15 }
});