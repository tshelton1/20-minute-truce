/* app/timer.tsx */
import * as _React from 'react'; // FIXED: Unified namespace import clears duplicate identifiers
import { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Animated, 
  Easing 
} from 'react-native';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TimerScreen() {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(1200); 
  const [isActive, setIsActive] = useState(true);
  
  const bgSound = useRef<Audio.Sound | null>(null);
  const alarmSound = useRef<Audio.Sound | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setupAudio();
    startPulse();
    Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }).start();

    return () => {
      stopAllAudio();
    };
  }, []);

  const stopAllAudio = async () => {
    try {
      if (bgSound.current) {
        await bgSound.current.stopAsync();
        await bgSound.current.unloadAsync();
        bgSound.current = null;
      }
      if (alarmSound.current) {
        await alarmSound.current.stopAsync();
        await alarmSound.current.unloadAsync();
        alarmSound.current = null;
      }
    } catch (e) {
      console.log("Timer audio cleanup suppressed:", e);
    }
  };

  const handleSkip = async () => {
    await stopAllAudio();
    router.replace('/(tabs)');
  };

  const handleBack = async () => {
    await stopAllAudio();
    router.back();
  };

  useEffect(() => {
    const syncAudio = async () => {
      if (!bgSound.current) return;
      try {
        const status = await bgSound.current.getStatusAsync();
        if (!status.isLoaded) return;

        if (isActive && timeLeft > 0) {
          await bgSound.current.playAsync();
        } else {
          await bgSound.current.pauseAsync();
        }
      } catch (error) {
        console.log("Audio sync error:", error);
      }
    };
    syncAudio();
  }, [isActive, timeLeft]);

  async function setupAudio() {
    try {
      const { sound: bgRes } = await Audio.Sound.createAsync(
        require('../assets/meditation-bg.mp3'),
        { isLooping: true, shouldPlay: true, volume: 0.4 }
      );
      bgSound.current = bgRes;

      const { sound: alarmRes } = await Audio.Sound.createAsync(
        require('../assets/alarm.mp3'),
        { shouldPlay: false, volume: 1.0 }
      );
      alarmSound.current = alarmRes;
    } catch (error) {
      console.log("Audio load error:", error);
    }
  }

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((prev: number) => prev - 1), 1000); // FIXED: Added type to prev
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleTimerComplete = async () => {
    setIsActive(false);
    try {
      if (bgSound.current) await bgSound.current.stopAsync();
      if (alarmSound.current) await alarmSound.current.playAsync();
    } catch (e) {
      console.log("Complete error:", e);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="chevron-down" size={30} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SOLITUDE</Text>
          <View style={{ width: 30 }} />
        </View>

        <Animated.View style={[styles.timerContainer, { opacity: fadeAnim }]}>
          <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
          <View style={styles.glassCircle}>
            <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
            <Text style={styles.subText}>{isActive ? 'minutes remaining' : 'time is up'}</Text>
          </View>
        </Animated.View>

        <View style={styles.messageBox}>
          <Text style={styles.headline}>Separate for 20 minutes</Text>
          <Text style={styles.bodyText}>
            Allow your nervous system to reset. Use this time to breathe, reflect, and calm the senses.
          </Text>
        </View>

        <View style={styles.footer}>
          {timeLeft === 0 ? (
            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={async () => {
                await stopAllAudio();
                router.replace('/(tabs)');
              }}
            >
              <Text style={styles.actionBtnText}>Reunite with Peace</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity 
                style={[styles.pauseBtn, !isActive && styles.resumeBtn]} 
                onPress={() => setIsActive(!isActive)}
              >
                <Ionicons name={isActive ? "pause" : "play"} size={24} color="white" />
                <Text style={styles.pauseBtnText}>{isActive ? 'Pause' : 'Resume'}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.skipBtn} 
                onPress={handleSkip}
              >
                <Text style={styles.skipBtnText}>Skip to Peace Tools</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  safeArea: { flex: 1, alignItems: 'center', justifyContent: 'space-between' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20, marginTop: 10 },
  headerTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '700', letterSpacing: 4 },
  backBtn: { padding: 5 },
  timerContainer: { justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  pulseRing: { position: 'absolute', width: 280, height: 280, borderRadius: 140, borderWidth: 1, borderColor: 'rgba(78, 205, 196, 0.2)', backgroundColor: 'rgba(78, 205, 196, 0.05)' },
  glassCircle: { width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1.5, borderColor: 'rgba(78, 205, 196, 0.3)', justifyContent: 'center', alignItems: 'center' },
  timerText: { fontSize: 64, fontWeight: '200', color: '#fff', letterSpacing: 2 },
  subText: { color: 'rgba(78, 205, 196, 0.6)', fontSize: 12, marginTop: -5, textTransform: 'uppercase', letterSpacing: 2 },
  messageBox: { paddingHorizontal: 40, alignItems: 'center' },
  headline: { color: 'white', fontSize: 24, fontWeight: '600', marginBottom: 15, textAlign: 'center' },
  bodyText: { color: '#94a3b8', fontSize: 16, textAlign: 'center', lineHeight: 24, fontWeight: '300' },
  footer: { width: '100%', alignItems: 'center', paddingHorizontal: 40, marginBottom: 40 },
  actionBtn: { backgroundColor: '#4ECDC4', paddingHorizontal: 40, paddingVertical: 18, borderRadius: 30, width: '100%', alignItems: 'center' },
  actionBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 16, letterSpacing: 1 },
  pauseBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 20 },
  resumeBtn: { borderColor: '#4ECDC4' },
  pauseBtnText: { color: 'white', marginLeft: 10, fontWeight: '600' },
  skipBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  skipBtnText: { color: '#4ECDC4', fontSize: 14, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
});