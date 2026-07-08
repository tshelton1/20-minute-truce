/* components/PremiumPaywall.tsx */
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
  Platform,
} from 'react-native';
import Purchases, {
  PACKAGE_TYPE,
  type PurchasesPackage,
  type PurchasesError,
  type CustomerInfo,
  type PurchasesOfferings,
} from 'react-native-purchases';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';

interface PurchasesInterface {
  isConfigured(): Promise<boolean>;
  configure(config: { apiKey: string }): void;
  getOfferings(): Promise<PurchasesOfferings>;
  purchasePackage(pkg: PurchasesPackage): Promise<{ customerInfo: CustomerInfo }>;
  restorePurchases(): Promise<CustomerInfo>;
}

const RC = Purchases as unknown as PurchasesInterface;

type PlanType = 'ANNUAL' | 'MONTHLY';

interface Props {
  isVisible: boolean;
  onClose: () => void;
}

function isAnnualPackage(pkg: PurchasesPackage): boolean {
  return pkg.packageType === PACKAGE_TYPE.ANNUAL;
}

function isMonthlyPackage(pkg: PurchasesPackage): boolean {
  return pkg.packageType === PACKAGE_TYPE.MONTHLY;
}

export default function PremiumPaywall({ isVisible, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [annualPkg, setAnnualPkg] = useState<PurchasesPackage | null>(null);
  const [monthlyPkg, setMonthlyPkg] = useState<PurchasesPackage | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('ANNUAL');

  const TERMS_URL = 'https://20minutetruce.com/terms';
  const PRIVACY_URL = 'https://20minutetruce.com/privacy';
  const UNIFORM_SPACING = 0.5;

  const selectedPkg = selectedPlan === 'ANNUAL' ? annualPkg : monthlyPkg;
  const annualPriceString = annualPkg?.product.priceString ?? '$59.99';
  const monthlyPriceString = monthlyPkg?.product.priceString ?? '$8.99';

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
      const packages =
        offerings.all['premium_offering']?.availablePackages ??
        offerings.current?.availablePackages ??
        [];

      let annual = packages.find(isAnnualPackage) ?? null;
      let monthly = packages.find(isMonthlyPackage) ?? null;

      if (!annual && packages[0]) annual = packages[0];
      if (!monthly && packages[1]) monthly = packages[1];

      setAnnualPkg(annual);
      setMonthlyPkg(monthly);
      setSelectedPlan('ANNUAL');
    } catch (e: unknown) {
      console.error("RevenueCat Offering Load Error:", e);
    }
  };

  const handlePurchase = async () => {
    if (__DEV__ && Constants.appOwnership === 'expo') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Alert.alert("Development Mode", "Purchases can't run in Expo Go — test purchases in TestFlight. The paywall will close (feature stays locked).");
      onClose();
      return;
    }

    if (!selectedPkg) {
      Alert.alert("Service Error", "Please check your internet connection.");
      return;
    }

    setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const purchaseResult = await RC.purchasePackage(selectedPkg);
      const customerInfo = purchaseResult.customerInfo;

      if (customerInfo.entitlements.active['premium_access'] !== undefined) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onClose();
      }
    } catch (e: unknown) {
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
      if (customerInfo.entitlements.active['premium_access'] !== undefined) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Success", "Your access has been restored.");
        onClose();
      } else {
        Alert.alert("Notice", "No active subscription found.");
      }
    } catch (e: unknown) {
      const error = e as Error;
      Alert.alert("Restore Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  const peaceHighlight = selectedPlan === 'ANNUAL'
    ? `Your peace: ${annualPriceString}/year (about $5/month)`
    : `Your peace: ${monthlyPriceString}/month`;

  const subBtnText = selectedPlan === 'ANNUAL'
    ? `${annualPriceString} PER YEAR`
    : `${monthlyPriceString} PER MONTH`;

  const billingNote = selectedPlan === 'ANNUAL'
    ? 'Auto-renews yearly until canceled. Cancel anytime in your App Store account settings.'
    : 'Auto-renews monthly until canceled. Cancel anytime in your App Store account settings.';

  const handleSelectPlan = async (plan: PlanType) => {
    await Haptics.selectionAsync();
    setSelectedPlan(plan);
  };

  const renderPlanCard = (
    plan: PlanType,
    badgeLabel: string,
    priceLine: string,
    subtitle: string,
  ) => {
    const isSelected = selectedPlan === plan;

    return (
      <TouchableOpacity
        key={plan}
        style={[
          styles.planCard,
          isSelected ? styles.planCardSelected : styles.planCardUnselected,
        ]}
        onPress={() => { void handleSelectPlan(plan); }}
        activeOpacity={0.85}
      >
        <View style={styles.planCardRow}>
          <View style={styles.planCardContent}>
            <View style={[styles.planBadge, isSelected ? styles.planBadgeSelected : styles.planBadgeUnselected]}>
              <Text style={[styles.planBadgeText, isSelected ? styles.planBadgeTextSelected : styles.planBadgeTextUnselected]}>
                {badgeLabel}
              </Text>
            </View>
            <Text style={[styles.planPrice, !isSelected && styles.planTextMuted]}>{priceLine}</Text>
            <Text style={[styles.planSubtitle, !isSelected && styles.planTextMuted]}>{subtitle}</Text>
          </View>

          <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
            {isSelected ? <View style={styles.radioDot} /> : null}
          </View>
        </View>
      </TouchableOpacity>
    );
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
                  <Text style={styles.emergencyBadgeText}>TRUCE PREMIUM</Text>
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
                    <Text style={[styles.painTitle, { color: '#f43f5e' }]}>EVERYTHING UNLOCKED</Text>
                    <Text style={styles.painDesc}>Unlimited Translator, unlimited Mediator, and your personal Pattern Reports — all in one.</Text>
                  </View>
                </View>
              </View>

              <View style={styles.priceComparisonContainer}>
                <Text style={styles.closingCall}>Therapy costs $200 for one hour.</Text>
                <Text style={styles.divorceWarning}>Divorce costs half of everything you own.</Text>
                <Text style={styles.peaceHighlight}>{peaceHighlight}</Text>
              </View>

              <View style={styles.planCards}>
                {renderPlanCard(
                  'ANNUAL',
                  'BEST VALUE',
                  `${annualPriceString}/year`,
                  "That's about $5/month — save 44%",
                )}
                {renderPlanCard(
                  'MONTHLY',
                  'FLEXIBLE',
                  `${monthlyPriceString}/month`,
                  'Cancel anytime — no commitment',
                )}
              </View>

              <TouchableOpacity style={styles.premiumBtn} onPress={handlePurchase} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#0f172a" />
                ) : (
                  <View style={styles.btnContent}>
                    <Text style={styles.premiumBtnText}>SAVE MY LOVE NOW</Text>
                    <Text style={styles.subBtnText}>{subBtnText}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.billingNote}>{billingNote}</Text>

              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeText}>Maybe later</Text>
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
  planCards: { width: '100%', marginTop: 18, gap: 12 },
  planCard: {
    width: '100%',
    minHeight: 112,
    padding: 17,
    borderRadius: 20,
  },
  planCardSelected: {
    borderWidth: 2,
    borderColor: '#4ECDC4',
    backgroundColor: 'rgba(78, 205, 196, 0.08)',
    shadowColor: '#4ECDC4',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  planCardUnselected: {
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.25)',
    backgroundColor: '#0f172a',
  },
  planCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  planCardContent: {
    flex: 1,
    alignItems: 'flex-start',
  },
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 8,
  },
  planBadgeSelected: {
    backgroundColor: '#4ECDC4',
    borderWidth: 0,
  },
  planBadgeUnselected: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.5)',
  },
  planBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  planBadgeTextSelected: {
    color: '#0f172a',
  },
  planBadgeTextUnselected: {
    color: '#4ECDC4',
  },
  planPrice: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
  },
  planSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  planTextMuted: {
    opacity: 0.75,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#4ECDC4',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ECDC4',
  },
  premiumBtn: { backgroundColor: '#4ECDC4', width: '100%', paddingVertical: 18, borderRadius: 100, marginTop: 20, alignItems: 'center', shadowColor: '#4ECDC4', shadowOpacity: 0.3, shadowRadius: 10 },
  btnContent: { alignItems: 'center' },
  premiumBtnText: { color: '#0f172a', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  subBtnText: { color: '#0f172a', fontWeight: '700', fontSize: 10, marginTop: 2, opacity: 0.8 },
  billingNote: { color: '#475569', fontSize: 10, marginTop: 10, textAlign: 'center', lineHeight: 14 },
  closeBtn: { marginTop: 20 },
  closeText: { color: '#64748b', fontSize: 13, textAlign: 'center', textDecorationLine: 'underline', fontWeight: '700' },
  footerLegal: { marginTop: 35, alignItems: 'center', width: '100%', opacity: 0.8 },
  legalLinksRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  legalLink: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
  divider: { color: '#334155', marginHorizontal: 15 },
});
