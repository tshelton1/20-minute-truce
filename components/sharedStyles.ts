import { StyleSheet } from 'react-native';

export const sharedStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backBtn: { marginRight: 15, backgroundColor: '#1e293b', borderRadius: 12, padding: 8 },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: '800' },
  subTitle: { color: '#4ECDC4', fontSize: 12, fontWeight: '600' },
  scrollContent: { paddingHorizontal: 20 },
  card: { backgroundColor: '#1e293b', borderRadius: 32, padding: 20 },
  inputContainer: { backgroundColor: '#0f172a', borderRadius: 24, padding: 20, minHeight: 180 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  inputLabel: { color: '#4ECDC4', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  micBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(78, 205, 196, 0.1)', justifyContent: 'center', alignItems: 'center' },
  micBtnActive: { backgroundColor: '#f43f5e' },
  input: { color: 'white', fontSize: 17, lineHeight: 24, textAlignVertical: 'top' },
  translateBtn: { backgroundColor: '#4ECDC4', marginTop: 25, paddingVertical: 20, borderRadius: 24, alignItems: 'center' },
  translateBtnText: { color: '#0f172a', fontSize: 16, fontWeight: '900', textTransform: 'uppercase' },
  
  // Add these inside your sharedStyles.ts object
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  nameInputContainer: { width: '48%' },
  nameInput: { backgroundColor: '#0f172a', borderRadius: 10, padding: 12, color: 'white', borderWidth: 1, borderColor: '#334155' },
  adviceBox: { backgroundColor: '#1e293b', borderRadius: 20, padding: 22, paddingTop: 35, paddingBottom: 45, borderWidth: 1, borderColor: 'rgba(78, 205, 196, 0.15)' },
  labelContainer: { position: 'absolute', top: -12, left: 0, right: 0, alignItems: 'center' },
  floatingLabel: { backgroundColor: '#4ECDC4', color: '#0f172a', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, fontSize: 10, fontWeight: '900' },
  copyButton: { position: 'absolute', bottom: 12, right: 15, flexDirection: 'row', alignItems: 'center', gap: 5 },
  copyText: { color: '#4ECDC4', fontSize: 10, fontWeight: '800' },
  // Result Box Styles
  resultCard: { backgroundColor: '#1e293b', borderRadius: 32, padding: 25, borderWidth: 1, borderColor: '#4ECDC4' },
  optionLabel: { color: '#D4AF37', fontSize: 10, fontWeight: '900', marginBottom: 20, letterSpacing: 2 }, // SET TO GOLD
  resultText: { color: 'white', fontSize: 19, lineHeight: 28, fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', marginTop: 30, justifyContent: 'space-between' },
  actionBtn: { flexDirection: 'row', backgroundColor: '#0f172a', paddingVertical: 15, paddingHorizontal: 20, borderRadius: 20, alignItems: 'center', width: '48%', justifyContent: 'center' },
  actionBtnText: { color: 'white', fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
  retryBtn: { marginTop: 30, alignItems: 'center' },
  retryText: { color: '#94a3b8', fontSize: 14, textDecorationLine: 'underline' },

  // Cycle Breaker Specific Styles
  heroSection: { alignItems: 'center', marginBottom: 10 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(212, 175, 55, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.2)' },
  heroText: { color: '#94a3b8', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  mainCta: { backgroundColor: '#D4AF37', paddingVertical: 18, paddingHorizontal: 40, borderRadius: 15 },
  ctaText: { color: '#0f172a', fontWeight: '900', fontSize: 14 },
  loaderContainer: { marginTop: 40, alignItems: 'center' },
  loaderText: { color: '#64748b', textAlign: 'center', marginTop: 20, fontSize: 13 },
  cardLabel: { fontSize: 11, fontWeight: '900' },
  cardBodyText: { color: '#FFF', fontSize: 15, lineHeight: 20, fontWeight: '500' },
  scriptBubble: { backgroundColor: 'rgba(78, 205, 196, 0.08)', borderRadius: 12, padding: 18, marginTop: 15, borderWidth: 1, borderColor: 'rgba(78, 205, 196, 0.2)', borderStyle: 'dashed' },
  scriptLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  scriptLabel: { color: '#4ECDC4', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  scriptText: { color: '#FFF', fontSize: 15, fontStyle: 'italic', lineHeight: 20, textAlign: 'center' },
  copyHint: { color: '#64748b', fontSize: 8, fontWeight: '800', textAlign: 'center', marginTop: 10 },
  refreshButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 25, marginBottom: 40 },
  refreshText: { color: '#64748b', fontSize: 11, fontWeight: '700' }
});