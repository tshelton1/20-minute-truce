/* app/welcome.tsx */
import * as _React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar,
  Linking,
  ScrollView,
  useWindowDimensions 
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function WelcomeScreen() {
  const router = useRouter();
  
  // 🛡️ THE FIX: This hook safely grabs the screen size and updates instantly on device rotation
  const { height } = useWindowDimensions(); 

  const handleGetStarted = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push('/login');
  };

  const openPrivacy = () => {
    Linking.openURL('https://gist.githubusercontent.com/tshelton1/91548bb0fa53e30177e9b7acb758d5da/raw/21f5a1dab50a494f6a5af7b3d372a6bbd4ae2248/PrivacyPolicy.md');
  };

  const openTerms = () => {
    Linking.openURL('https://gist.githubusercontent.com/tshelton1/059deba6c55a19e2ae50a8fd757cd670/raw/1e3e0aff774c98212661c589397acf725b0dbd80/TermsOfUse.md');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* 🛡️ THE FIX: We pass the dynamic height here, and rely on maxWidth in the stylesheet */}
        <View style={[styles.content, { minHeight: height - 100 }]}>
          
          {/* Headline Section */}
          <View style={styles.headerSection}>
            <Text style={styles.preHeadline}>STOP THE SPIRAL</Text>
            <Text style={styles.mainHeadline}>
              Turn Heated Arguments Into <Text style={styles.highlightText}>Effortless Connection</Text> Without The $200/hr Therapy Bill.
            </Text>
            <View style={styles.accentLine} />
          </View>

          {/* Value Prop Section */}
          <View style={styles.valuePropContainer}>
            <View style={styles.benefitRow}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#4ECDC4" />
              <Text style={styles.benefitText}>Exit the "Blame Loop" immediately</Text>
            </View>
            <View style={styles.benefitRow}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#4ECDC4" />
              <Text style={styles.benefitText}>Science-backed Peace Tools</Text>
            </View>
            <View style={styles.benefitRow}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#4ECDC4" />
              <Text style={styles.benefitText}>Restore the "Same Team" connection</Text>
            </View>
          </View>

          {/* Quote Section */}
          <View style={styles.reminderContainer}>
            <Text style={styles.reminderText}>
              "The goal isn’t to win the fight—it’s to win back the relationship."
            </Text>
          </View>

          {/* CTA Section */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.primaryBtn} 
              onPress={handleGetStarted}
              activeOpacity={0.9}
            >
              <View style={styles.btnContent}>
                <Text style={styles.primaryBtnText}>START YOUR TRUCE NOW</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color="white" />
              </View>
            </TouchableOpacity>
            <Text style={styles.subBtnText}>Takes less than 30 seconds to begin</Text>
          </View>

          {/* Legal Footer Section */}
          <View style={styles.legalFooter}>
            <Text style={styles.footerText}>Conflict is temporary. Peace is a practice.</Text>
            <View style={styles.legalLinksRow}>
              <TouchableOpacity onPress={openTerms}>
                <Text style={styles.legalLink}>Terms of Use</Text>
              </TouchableOpacity>
              <Text style={styles.legalDivider}>|</Text>
              <TouchableOpacity onPress={openPrivacy}>
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    flexGrow: 1, 
  },
  content: {
    flex: 1,
    paddingHorizontal: 35,
    paddingVertical: 14,
    justifyContent: 'space-between', 
    
    /* 🛡️ THE FIX: The iPad Magic Constraints */
    width: '100%',
    maxWidth: 500,       // Caps the width so it doesn't stretch on tablets
    alignSelf: 'center', // Forces the whole column into the exact middle of the iPad screen
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  preHeadline: {
    color: '#C41E3A',
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 8,
    textAlign: 'center',
  },
  mainHeadline: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 38,
    textAlign: 'center',
  },
  highlightText: {
    color: '#4ECDC4',
    textDecorationLine: 'underline',
  },
  accentLine: {
    width: 60,
    height: 4,
    backgroundColor: '#4ECDC4',
    marginTop: 20,
    borderRadius: 2,
  },
  valuePropContainer: {
    marginBottom: 30,
    gap: 20,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '500',
  },
  reminderContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#4ECDC4',
    marginBottom: 25,
  },
  reminderText: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '400',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  primaryBtn: {
    backgroundColor: '#008080',
    width: '100%',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subBtnText: {
    color: '#475569',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  legalFooter: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    color: '#C41E3A',
    fontSize: 9,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
    opacity: 0.7,
    marginBottom: 10,
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legalLink: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  legalDivider: {
    color: '#334155',
    fontSize: 11,
  },
});