/* app/breathing.tsx */
import * as _React from "react"; 
import { useEffect, useRef, useState } from 'react'; 
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Easing, 
  SafeAreaView, 
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { Audio } from 'expo-av';
import { useRouter, useNavigation } from 'expo-router';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const BASE_CIRCLE_SIZE = width * 0.3; 
const BASE_SIZE_RADIUS = BASE_CIRCLE_SIZE / 2;

export default function BreathingScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [phase, setPhase] = useState('READY'); 
  const [cycle, setCycle] = useState(0);
  const [timer, setTimer] = useState(0);

  const bgAnim = useRef(new Animated.Value(0)).current;
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const heartbeatAnim = useRef(new Animated.Value(1)).current;
  
  const innerScales = useRef([new Animated.Value(1), new Animated.Value(1)]).current; 
  const midScales = useRef([new Animated.Value(1), new Animated.Value(1)]).current;   
  const outerScales = useRef([new Animated.Value(1), new Animated.Value(1)]).current; 

  const meditationSound = useRef<Audio.Sound | null>(null);
  const chakraSound = useRef<Audio.Sound | null>(null);

  const backgroundColor = bgAnim.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: ['#1a2151', '#2d4a3e', '#1a2151', '#3b1a51'],
  });

  const rotate = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // --- FIXED AUDIO LOGIC ---
  useEffect(() => {
    const startMeditationMusic = async () => {
      try {
        // 🛡️ THE FIX: Set mode correctly and disable mic priority
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
        duration: 4000,
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
      ...innerScales.map(anim => Animated.timing(anim, { toValue: 3.2, duration: 4000, easing: Easing.bezier(0.33, 1, 0.68, 1), useNativeDriver: true })),
      ...midScales.map(anim => Animated.timing(anim, { toValue: 1.8, duration: 4000, easing: Easing.linear, useNativeDriver: true })),
      ...outerScales.map(anim => Animated.timing(anim, { toValue: 1.4, duration: 4000, easing: Easing.linear, useNativeDriver: true })),
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
          ...innerScales.map(anim => Animated.timing(anim, { toValue: 0.8, duration: 8000, easing: Easing.out(Easing.sin), useNativeDriver: true })),
          ...midScales.map(anim => Animated.timing(anim, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true })),
          ...outerScales.map(anim => Animated.timing(anim, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true })),
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
    // 🛡️ FIXED: NotificationFeedbackType case correction
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
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
          <Text style={styles.headerTitle}>BREATHWORK</Text>
          <Text style={styles.cycleLabel}>{phase === 'COMPLETE' ? 'Restoring Peace' : `Cycle ${cycle + 1} of 3`}</Text>
        </View>

        <View style={styles.centerStage}>
          {outerScales.map((anim, i) => (
            <Animated.View key={`outer-${i}`} style={[
              styles.circleBase, 
              styles.outerRing, 
              { transform: [{ scale: Animated.multiply(anim, heartbeatAnim) }], opacity: 0.05 + (i * 0.05) }
            ]} />
          ))}

          <Animated.View style={[styles.circleBase, styles.rotatingRing, { transform: [{ scale: midScales[1] }, { rotate }] }]}>
            {[...Array(8)].map((_, i) => (
              <View key={i} style={[styles.dot, { transform: [{ rotate: `${i * 45}deg` }, { translateY: -BASE_SIZE_RADIUS * 2.2 }] }]} />
            ))}
          </Animated.View>

          <Animated.View style={[styles.circleBase, styles.midRing, { transform: [{ scale: midScales[0] }] }]} />

          {innerScales.map((anim, i) => (
            <Animated.View key={`inner-${i}`} style={[
              styles.circleBase, 
              styles.innerRing, 
              { transform: [{ scale: anim }], opacity: 0.1 + (i * 0.15) }
            ]} />
          ))}

          <Animated.View style={[styles.coreCircle, { transform: [{ scale: innerScales[0] }] }]}>
            <View style={styles.textContainer}>
               <Text style={styles.phaseTxt}>
                {phase === 'READY' ? 'Ready' : phase === 'INHALE' ? 'Inhale' : phase === 'HOLD' ? 'Hold' : phase === 'EXHALE' ? 'Exhale' : 'Peace'}
              </Text>
              {timer > 0 && phase !== 'COMPLETE' && <Text style={styles.timerTxt}>{timer}</Text>}
            </View>
          </Animated.View>
        </View>

        <View style={styles.descriptionBox}>
          <Text style={styles.scienceBody}>
            This 4-7-8 sequence stimulates the Vagus Nerve, physically forcing your nervous system to lower your heart rate and exit the Flight or Fight mode.
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
  header: { alignItems: 'center', marginTop: 20 },
  headerTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', letterSpacing: 4 },
  cycleLabel: { color: 'white', fontSize: 18, marginTop: 4, fontWeight: '600' },
  centerStage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  circleBase: { position: 'absolute', borderRadius: 999 },
  outerRing: { width: BASE_CIRCLE_SIZE * 3, height: BASE_CIRCLE_SIZE * 3, borderWidth: 1, borderColor: 'white' },
  rotatingRing: { width: BASE_CIRCLE_SIZE * 2.5, height: BASE_CIRCLE_SIZE * 2.5, borderWidth: 0, justifyContent: 'center', alignItems: 'center' },
  midRing: { width: BASE_CIRCLE_SIZE * 2, height: BASE_CIRCLE_SIZE * 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  innerRing: { width: BASE_CIRCLE_SIZE * 1.5, height: BASE_CIRCLE_SIZE * 1.5, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  coreCircle: { 
    width: BASE_CIRCLE_SIZE, 
    height: BASE_CIRCLE_SIZE, 
    borderRadius: BASE_CIRCLE_SIZE / 2, 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  textContainer: { alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.8)' },
  phaseTxt: { color: 'white', fontSize: 18, fontWeight: '400', letterSpacing: 1, textAlign: 'center' },
  timerTxt: { color: 'white', fontSize: 38, fontWeight: '800', marginTop: -5 },
  descriptionBox: { paddingHorizontal: 40, marginBottom: 20 },
  scienceBody: { color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontSize: 12, lineHeight: 18, fontStyle: 'italic' },
  footer: { paddingHorizontal: 50, marginBottom: 40 },
  skipBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  skipBtnText: { color: '#1a2151', fontSize: 12, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
});