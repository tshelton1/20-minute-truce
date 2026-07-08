import * as React from "react";
import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  Platform
} from 'react-native';
import { Audio } from 'expo-av';
import { useRouter, useNavigation } from 'expo-router';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const BASE_CIRCLE_SIZE = width * 0.35;
const BASE_SIZE_RADIUS = BASE_CIRCLE_SIZE / 2;

// ─── LUXURY TOKENS ──────────────────────────────────────────
const SERIF = Platform.select({ ios: 'Georgia', android: 'serif' });
const GOLD = '#D8C29A';            // champagne gold — accents, rings, numerals
const GOLD_SOFT = 'rgba(216,194,154,0.55)';
const GOLD_FAINT = 'rgba(216,194,154,0.14)';
const IVORY = '#F4EEE2';           // warm ivory — primary text
const IVORY_DIM = 'rgba(244,238,226,0.55)';
// ────────────────────────────────────────────────────────────

export default function BreathingScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [phase, setPhase] = useState('READY');
  const [cycle, setCycle] = useState(0);
  const [timer, setTimer] = useState(0);

  const bgAnim = useRef(new Animated.Value(0)).current;
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const heartbeatAnim = useRef(new Animated.Value(1)).current;
  const bloomAnim = useRef(new Animated.Value(0)).current;

  const meditationSound = useRef<Audio.Sound | null>(null);
  const chakraSound = useRef<Audio.Sound | null>(null);

  // Bolder, distinct color transitions for each phase
  const backgroundColor = bgAnim.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [
      '#12101B', // 0: READY (Midnight Plum)
      '#0D3B33', // 1: INHALE (Deep Forest/Teal)
      '#2B1B4D', // 2: HOLD (Rich Indigo)
      '#4A1525', // 3: EXHALE (Deep Burgundy)
    ],
  });

  const rotate = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // --- AUDIO LOGIC ---
  useEffect(() => {
    const startMeditationMusic = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        const { sound } = await Audio.Sound.createAsync(
          require('../assets/meditation-bg.mp3'),
          { isLooping: true, shouldPlay: true, volume: 1.0 }
        );
        meditationSound.current = sound;
      } catch (error) {
        console.log('Meditation audio load error:', error);
      }
    };

    startMeditationMusic();
    startBaseAnimations();

    const unsubscribe = navigation.addListener('blur', () => {
      stopAllAudio();
    });

    return () => {
      unsubscribe();
      stopAllAudio();
    };
  }, [navigation]);

  const stopAllAudio = async () => {
    try {
      if (meditationSound.current) {
        await meditationSound.current.stopAsync();
        await meditationSound.current.unloadAsync();
        meditationSound.current = null;
      }
      if (chakraSound.current) {
        await chakraSound.current.stopAsync();
        await chakraSound.current.unloadAsync();
        chakraSound.current = null;
      }
    } catch (e) {
      console.log("Audio cleanup error:", e);
    }
  };

  const startBaseAnimations = () => {
    Animated.loop(
      Animated.timing(rotationAnim, {
        toValue: 1,
        duration: 16000, // Slow, calming continuous rotation
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(heartbeatAnim, { toValue: 1.05, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(heartbeatAnim, { toValue: 1, duration: 1200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  };

  const handleExit = async () => {
    await stopAllAudio();
    router.replace('/(tabs)');
  };

  const runSequence = () => {
    setPhase('INHALE');
    setTimer(4);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.parallel([
      Animated.timing(bgAnim, { toValue: 1, duration: 1000, useNativeDriver: false }),
      Animated.timing(bloomAnim, { toValue: 1, duration: 4000, easing: Easing.bezier(0.33, 1, 0.68, 1), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (!finished) return;

      setPhase('HOLD');
      setTimer(7);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Animated.timing(bgAnim, { toValue: 2, duration: 1000, useNativeDriver: false }).start();

      setTimeout(() => {
        setPhase('EXHALE');
        setTimer(8);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        Animated.parallel([
          Animated.timing(bgAnim, { toValue: 3, duration: 1000, useNativeDriver: false }),
          Animated.timing(bloomAnim, { toValue: 0, duration: 8000, easing: Easing.out(Easing.sin), useNativeDriver: true }),
        ]).start(({ finished }) => {
          if (!finished) return;

          if (cycle < 2) {
            setCycle(c => c + 1);
          } else {
            completeSession();
          }
        });
      }, 7000);
    });
  };

  const completeSession = async () => {
    setPhase('COMPLETE');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.timing(bgAnim, { toValue: 0, duration: 2000, useNativeDriver: false }).start();

    try {
      if (meditationSound.current) {
        await meditationSound.current.stopAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/chakra.mp3'),
        { shouldPlay: true, volume: 1.0 }
      );
      chakraSound.current = sound;

      setTimeout(async () => {
        await stopAllAudio();
        router.replace('/timer?duration=1200');
      }, 3000);
    } catch (_error) {
      router.replace('/timer?duration=1200');
    }
  };

  useEffect(() => {
    let _interval: ReturnType<typeof setInterval>;
    if (timer > 0) {
      _interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(_interval);
  }, [timer]);

  useEffect(() => {
    if (cycle === 0 && phase === 'READY') {
      const init = setTimeout(runSequence, 2000);
      return () => clearTimeout(init);
    } else if (cycle > 0 && phase !== 'COMPLETE') {
      runSequence();
    }
  }, [cycle]);

  return (
    <Animated.View style={[styles.container, { backgroundColor }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>THE TRUCE BEGINS</Text>
          <View style={styles.headerRule} />
          <Text style={styles.cycleLabel}>
            {phase === 'COMPLETE' ? 'Peace, restored' : `Breath ${cycle + 1} of 3`}
          </Text>
        </View>

        <View style={styles.centerStage}>
          {/* Outer Rotating Lotus Petals */}
          <Animated.View style={[styles.flowerContainer, { transform: [{ rotate }] }]}>
            {[...Array(6)].map((_, i) => {
              const petalRotate = `${i * 60}deg`;
              const translateX = bloomAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, BASE_CIRCLE_SIZE * 0.7]
              });
              const scale = bloomAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1.4]
              });

              return (
                <Animated.View
                  key={`petal-${i}`}
                  style={[
                    styles.petal,
                    {
                      transform: [
                        { rotate: petalRotate },
                        { translateX },
                        { scale }
                      ]
                    }
                  ]}
                />
              );
            })}
          </Animated.View>

          {/* Inner Pulsing Core */}
          <Animated.View style={[styles.coreCircle, { transform: [{ scale: heartbeatAnim }] }]}>
            <View style={styles.textContainer}>
              <Text style={styles.phaseTxt}>
                {phase === 'READY' ? 'Ready' : phase === 'INHALE' ? 'Inhale' : phase === 'HOLD' ? 'Hold' : phase === 'EXHALE' ? 'Exhale' : 'Peace'}
              </Text>
              {timer > 0 && phase !== 'COMPLETE' && <Text style={styles.timerTxt}>{timer}</Text>}
            </View>
          </Animated.View>
        </View>

        <View style={styles.descriptionBox}>
          <View style={styles.descriptionRule} />
          <Text style={styles.scienceBody}>
            The 4-7-8 rhythm quiets the vagus nerve, easing your body out of fight-or-flight — so you can return to each other calm.
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={handleExit}
          >
            <Text style={styles.skipBtnText}>Skip to Peace Tools</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  header: { alignItems: 'center', marginTop: 24 },
  headerTitle: {
    color: GOLD_SOFT,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 5,
  },
  headerRule: {
    width: 28,
    height: 1,
    backgroundColor: GOLD_FAINT,
    marginTop: 10,
    marginBottom: 10,
  },
  cycleLabel: {
    color: IVORY,
    fontSize: 19,
    fontFamily: SERIF,
    letterSpacing: 1.5,
  },

  centerStage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  flowerContainer: {
    position: 'absolute',
    width: BASE_CIRCLE_SIZE,
    height: BASE_CIRCLE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  petal: {
    position: 'absolute',
    width: BASE_CIRCLE_SIZE * 1.4,
    height: BASE_CIRCLE_SIZE * 1.4,
    borderRadius: (BASE_CIRCLE_SIZE * 1.4) / 2,
    backgroundColor: 'rgba(216,194,154,0.08)',
    borderWidth: 1,
    borderColor: GOLD_SOFT,
  },

  coreCircle: {
    position: 'absolute',
    width: BASE_CIRCLE_SIZE,
    height: BASE_CIRCLE_SIZE,
    borderRadius: BASE_SIZE_RADIUS,
    backgroundColor: 'rgba(216,194,154,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GOLD,
    shadowColor: GOLD,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },

  textContainer: { alignItems: 'center', justifyContent: 'center' },

  phaseTxt: {
    color: IVORY,
    fontSize: 20,
    fontFamily: SERIF,
    fontStyle: 'italic',
    letterSpacing: 2,
    textAlign: 'center',
  },
  timerTxt: {
    color: GOLD,
    fontSize: 40,
    fontWeight: '300',
    fontFamily: SERIF,
    marginTop: 2,
  },

  descriptionBox: { paddingHorizontal: 44, marginBottom: 22, alignItems: 'center' },
  descriptionRule: {
    width: 28,
    height: 1,
    backgroundColor: GOLD_FAINT,
    marginBottom: 14,
  },
  scienceBody: {
    color: IVORY_DIM,
    textAlign: 'center',
    fontSize: 12.5,
    lineHeight: 20,
    fontFamily: SERIF,
    fontStyle: 'italic',
  },

  footer: { paddingHorizontal: 50, marginBottom: 40 },
  skipBtn: {
    backgroundColor: 'transparent',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GOLD_SOFT,
  },
  skipBtnText: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});