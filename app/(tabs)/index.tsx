/* app/(tabs)/index.tsx */
import * as _React from "react"; 
import { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Animated, 
  Easing,
  ScrollView,
  Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// PROD-READY: Removed .ts extension to resolve ts(5097)
import { supabase } from '../../src/lib/supabase';

const MESSAGES = [
  { label: "SAME TEAM PROTOCOL", text: "Struggling to be right is the fastest way to be alone. Pivot your energy. You’re on the same team." },
  { label: "CONNECTION TASK", text: "Send 1 'Appreciation Text' right now. No request, no complaint—just one thing you admire about them." },
  { label: "PHYSICAL ANCHOR", text: "Non-sexual touch short-circuits the stress response. Aim for 2 intentional touches (hug, hand on shoulder) today." },
  { label: "THE 20-MINUTE RULE", text: "Most arguments escalate because of fatigue. If it's heated after 20 minutes, use the 'Peace' timer. No exceptions." },
  { label: "THE 'WE' REFRAME", text: "It’s not 'You vs. Me.' It’s 'Us vs. The Problem.' If you win the argument but your partner feels defeated, you both just lost." },
  { label: "SNEAK ATTACK KINDNESS", text: "Do one small chore your partner usually hates doing today. Don't announce it. Let them discover it. Silent service is a high-level intimacy builder." },
  { label: "FUTURE CASTING", text: "In 5 years, will this specific argument matter? If the answer is no, stop treating it like a life-or-death crisis. Save your energy for the love." },
  { label: "THE APPRECIATION DEPOSIT", text: "Relationships die from a lack of notice. Find one tiny thing they did right today—and call it out. High-value partners notice small wins." },
  { label: "CURIOSITY OVER CRITICISM", text: "Replace 'Why did you do that?' with 'Can you help me understand your perspective?' Understanding doesn't mean agreeing." },
  { label: "THE REPAIR ATTEMPT", text: "A joke or a quick 'I'm sorry I snapped' can save an entire evening. Don't let pride keep you from making the first repair attempt." },
  { label: "BID FOR CONNECTION", text: "When they share a random thought, they are 'bidding' for your attention. Turn toward them. These 5-second moments build a fortress." },
];

export default function HubScreen() {
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;
  const UNIFORM_SPACING = 0.5;

  const [dailyTip, setDailyTip] = useState(MESSAGES[0]);

  useEffect(() => {
    const randomTip = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
    setDailyTip(randomTip);

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.2,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.6,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim, opacityAnim]);

  const handleLogout = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace('/welcome'); 
    } catch (err) {
      console.error("Logout Error:", err);
    }
  };

  const handleCycleBreakerPress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      router.push("/cycle-breaker");
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={[styles.headerTitle, { letterSpacing: 4 }]}>PEACE TOOLS</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.7}>
          <MaterialCommunityIcons name="logout-variant" size={24} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.peaceSection}>
          <View style={styles.animationContainer}>
            <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }], opacity: opacityAnim }]} />
            <TouchableOpacity 
              style={styles.peaceButton}
              onPress={() => router.push('/breathing')}
            >
              <MaterialCommunityIcons name="heart" size={60} color="white" />
              <Text style={[styles.peaceText, { letterSpacing: 2 }]}>PEACE</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.subtext, { letterSpacing: UNIFORM_SPACING }]}>Tap for a 20-minute peace break</Text>
        </View>

        <View style={styles.toolsSection}>
          <Text style={[styles.sectionLabel, { letterSpacing: 1.5 }]}>QUICK TOOLS</Text>
          
          <View style={styles.row}>
            <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/translate')}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="chat-outline" size={28} color="white" />
              </View>
              <Text style={[styles.cardTitle, { letterSpacing: UNIFORM_SPACING }]}>
                Real-Talk Translator
              </Text>
              <Text style={[styles.cardSubtitle, { letterSpacing: 0.2 }]}>Turn mean texts into kind ones</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/(tabs)/mediator')}>
              <View style={[styles.iconCircle, { backgroundColor: '#7c4dff' }]}>
                <FontAwesome5 name="users" size={20} color="white" />
              </View>
              <Text style={[styles.cardTitle, { letterSpacing: UNIFORM_SPACING }]}>
                Peace Mediator
              </Text>
              <Text style={[styles.cardSubtitle, { letterSpacing: 0.2 }]}>Get neutral guidance</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.reminderCard}>
             <Text style={[styles.reminderLabel, { letterSpacing: 2 }]}>{dailyTip.label}</Text>
             <Text style={[styles.reminderText, { letterSpacing: 0.3 }]}>{dailyTip.text}</Text>
          </View>
        </View>

        <View style={[styles.promoContainer, { marginTop: 25 }]}>
          <View style={styles.promoLayout}>
            <View style={styles.iconCirclePromo}>
              <MaterialCommunityIcons name="sync-off" size={20} color="#D4AF37" />
            </View>
            <View style={styles.textColumn}>
              <Text style={[styles.promoHeadline, { letterSpacing: 1 }]}>STOP THE "INFINITY LOOP"</Text>
              <Text style={[styles.subiDescription, { letterSpacing: UNIFORM_SPACING }]}>
                I&apos;ll decode the hidden mechanics of your last 5 Peace Mediator sessions to break your recurring fight cycle.
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.ctaButton} onPress={handleCycleBreakerPress} activeOpacity={0.8}>
            <View style={styles.buttonInner}>
              <Text style={[styles.ctaText, { letterSpacing: 1.5 }]}>REVEAL OUR CYCLE</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color="#0f172a" />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2233' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 0 : 20, paddingBottom: 10 },
  headerTitle: { color: '#64748b', fontSize: 12, fontWeight: '900' },
  logoutBtn: { padding: 10 },
  scrollContent: { paddingBottom: 40 },
  peaceSection: { marginTop: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  animationContainer: { justifyContent: 'center', alignItems: 'center', width: 200, height: 200 },
  pulseCircle: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: '#f43f5e' },
  peaceButton: { width: 130, height: 130, borderRadius: 65, backgroundColor: '#f43f5e', justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10 },
  peaceText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginTop: 5 },
  subtext: { color: '#94a3b8', marginTop: 10, fontSize: 13 },
  promoContainer: { backgroundColor: '#252e42', borderRadius: 16, padding: 15, marginHorizontal: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.3)' },
  promoLayout: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
  iconCirclePromo: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(212, 175, 55, 0.1)', justifyContent: 'center', alignItems: 'center' },
  textColumn: { flex: 1 },
  promoHeadline: { color: '#D4AF37', fontSize: 14, fontWeight: '900', marginBottom: 4 },
  subiDescription: { color: '#94a3b8', fontSize: 12, lineHeight: 18 },
  ctaButton: { backgroundColor: '#D4AF37', paddingVertical: 10, borderRadius: 8, width: '100%' },
  buttonInner: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  ctaText: { color: '#0f172a', fontSize: 12, fontWeight: '900' },
  toolsSection: { paddingHorizontal: 20, marginTop: 20 },
  sectionLabel: { color: '#64748b', fontSize: 11, fontWeight: 'bold', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  toolCard: { flex: 1, backgroundColor: '#252e42', borderRadius: 20, padding: 15, height: 140, justifyContent: 'space-between' },
  iconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { color: 'white', fontSize: 13, fontWeight: 'bold', lineHeight: 16 },
  cardSubtitle: { color: '#94a3b8', fontSize: 10 },
  reminderCard: { marginTop: 15, backgroundColor: 'rgba(37, 46, 66, 0.7)', borderRadius: 16, padding: 15, borderLeftWidth: 3, borderLeftColor: '#4ECDC4' },
  reminderLabel: { color: '#4ECDC4', fontSize: 10, fontWeight: '900', marginBottom: 6 },
  reminderText: { color: '#cbd5e1', fontSize: 12, lineHeight: 18, fontStyle: 'italic' }
});