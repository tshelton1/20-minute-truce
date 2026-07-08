import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import Purchases, { type CustomerInfo } from 'react-native-purchases';
import { supabase } from './supabase';

const USAGE_KEYS = {
  translator: 'usage_translator',
  analyzer: 'usage_analyzer',
} as const;

const FREE_LIMITS = {
  translator: 3,
  mediator: 3,
  analyzer: 1,
} as const;

type UsageFeature = keyof typeof USAGE_KEYS;

interface PurchasesInterface {
  getCustomerInfo(): Promise<CustomerInfo>;
}

const RC = Purchases as unknown as PurchasesInterface;

export async function isPremium(): Promise<boolean> {
  if (Constants.appOwnership === 'expo') {
    return false;
  }

  try {
    const customerInfo = await RC.getCustomerInfo();
    return customerInfo.entitlements.active['premium_access'] !== undefined;
  } catch {
    return false;
  }
}

export async function getUsageCount(feature: UsageFeature): Promise<number> {
  const raw = await AsyncStorage.getItem(USAGE_KEYS[feature]);
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function incrementUsage(feature: UsageFeature): Promise<number> {
  const next = (await getUsageCount(feature)) + 1;
  await AsyncStorage.setItem(USAGE_KEYS[feature], String(next));
  return next;
}

export async function getMediatorCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('mediator_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    console.error('getMediatorCount error:', error);
    return 0;
  }

  return count ?? 0;
}

export async function canUse(
  feature: 'translator' | 'mediator' | 'analyzer',
  userId?: string,
): Promise<boolean> {
  if (await isPremium()) return true;

  if (feature === 'mediator') {
    if (!userId) return false;
    return (await getMediatorCount(userId)) < FREE_LIMITS.mediator;
  }

  if (feature === 'translator') {
    return (await getUsageCount('translator')) < FREE_LIMITS.translator;
  }

  return (await getUsageCount('analyzer')) < FREE_LIMITS.analyzer;
}

export const FREE_USAGE_LIMITS = FREE_LIMITS;
