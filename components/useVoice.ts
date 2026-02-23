/* components/useVoice.ts */
import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { supabase } from '../src/lib/supabase';

export function useVoice() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  // 🛡️ EFFECTIVE CLEANUP: Unload the mic if the component unmounts
  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [recording]);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert("Permission Required", "Please enable microphone access in your phone settings.");
        return;
      }

      // 🛡️ THE FIX: Set up the audio session correctly without "rebooting" the entire OS audio engine
      await Audio.setAudioModeAsync({ 
        allowsRecordingIOS: true, 
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      // Create the recording object
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err: any) { 
      console.error("Start Recording Error:", err);
      // 🛡️ STOP SILENT FAILURES: Tell the user exactly why it didn't start
      Alert.alert("Microphone Error", err.message || "Could not start the microphone.");
      setRecording(null);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!recording) return null;
    
    setIsRecording(false);
    setTranscribing(true);
    
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null); 

      // 🛡️ Clean up the audio mode so the app doesn't stay stuck in "recording mode"
      await Audio.setAudioModeAsync({ 
        allowsRecordingIOS: false, 
      });

      if (uri) {
        const formData = new FormData();
        // Native file object structure
        const fileData = {
          uri,
          type: 'audio/m4a',
          name: 'speech.m4a',
        };
        
        formData.append('file', fileData as any);

        const { data, error } = await supabase.functions.invoke('speech-to-text', {
          body: formData,
        });

        if (error) {
          console.error("Transcription Edge Function Error:", error);
          Alert.alert("Transcription Error", "The AI server failed to process your audio. Check your OpenAI API Key.");
          return null;
        }

        return data?.text || "";
      }
    } catch (err: any) { 
      console.error("Stop/Transcription Error:", err);
      Alert.alert("Connection Error", err.message || "Something went wrong while transcribing.");
    } finally { 
      setTranscribing(false); 
      setRecording(null);
    }
    return null;
  };

  return { isRecording, transcribing, startRecording, stopRecording };
}