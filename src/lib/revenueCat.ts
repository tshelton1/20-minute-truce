import Purchases from 'react-native-purchases';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const initRevenueCat = async () => {
  try {
    // 🛡️ Skip completely if in Expo Go to avoid singleton errors
    if (Constants.appOwnership === 'expo') return;

    const apiKey = Platform.select({
      ios: process.env.EXPO_PUBLIC_RC_IOS_KEY,
      android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY,
    });

    if (!apiKey) return;

    // 🚀 Configure the singleton
    await Purchases.configure({ apiKey });
    console.log("✅ RevenueCat: Configured successfully.");
  } catch (error) {
    console.log("⚠️ RevenueCat: Init failed (expected in dev).");
  }
};

// 🛡️ Safety Wrapper: Only checks status if the SDK is actually configured
export const getSubscriptionStatus = async () => {
  try {
    const isConfigured = await Purchases.isConfigured();
    if (!isConfigured) return { isActive: false };

    const customerInfo = await Purchases.getCustomerInfo();
    return { isActive: customerInfo.entitlements.active['pro'] !== undefined };
  } catch (e) {
    return { isActive: false };
  }
};