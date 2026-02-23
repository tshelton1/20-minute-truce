/* app/(tabs)/history.tsx */
import * as _React from 'react';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  SectionList
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

// PROD-READY: Mandatory Supabase import
import { supabase } from '../../src/lib/supabase';

interface MediationLog {
  id: string;
  type: 'mediation';
  user_name: string;
  partner_name: string;
  ai_response: string;
  created_at: string;
  display_text: string;
}

export default function HistoryScreen() {
  const [logs, setLogs] = useState<MediationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 🛡️ PROD-READY: Fetching from mediator_logs
      const { data: mediatorData, error: mediatorError } = await supabase
        .from('mediator_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (mediatorError) throw mediatorError;

      // Map the data into a consistent display format
      const formattedLogs = (mediatorData || []).map(log => ({
        ...log,
        type: 'mediation',
        display_text: `${log.user_name} + ${log.partner_name}`
      }));

      setLogs(formattedLogs);
    } catch (error: any) {
      console.error('Error fetching history:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      "Delete Record",
      "Permanently remove this from your history?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.from('mediator_logs').delete().eq('id', id);
              if (error) throw error;
              setLogs(prev => prev.filter(log => log.id !== id));
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err) {
              Alert.alert("Error", "Could not delete log.");
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderLogItem = ({ item }: { item: MediationLog }) => (
    <TouchableOpacity 
      style={styles.logCard}
      activeOpacity={0.7}
      onPress={async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert("Resolution Detail", item.ai_response, [{ text: "Done" }]);
      }}
    >
      <View style={styles.logHeader}>
        <View style={styles.nameGroup}>
          <MaterialCommunityIcons name="scale-balance" size={16} color="#D4AF37" />
          <Text style={styles.logNames}>{item.display_text}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item.id)}>
          {/* FIXED: Using Cardinal Red for the delete icon */}
          <MaterialCommunityIcons name="trash-can-outline" size={18} color="#C41E3A" />
        </TouchableOpacity>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.logDate}>{formatDate(item.created_at)}</Text>
        <View style={styles.viewBadge}>
          <Text style={styles.viewText}>VIEW ANALYSIS</Text>
          <MaterialCommunityIcons name="chevron-right" size={14} color="#4ECDC4" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="history" size={26} color="#D4AF37" />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Conflict History</Text>
          <Text style={styles.subTitle}>Pattern Tracking</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4ECDC4" />
        </View>
      ) : (
        <FlatList
          data={logs}
          renderItem={renderLogItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4ECDC4" />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="comment-off-outline" size={48} color="#334155" />
              <Text style={styles.emptyText}>No logs found. Conflict-free!</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  headerText: { marginLeft: 12 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: '800' },
  subTitle: { color: '#4ECDC4', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  listContent: { padding: 20, paddingBottom: 100 },
  logCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logNames: { color: '#f8fafc', fontWeight: '700', fontSize: 14 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  logDate: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  viewBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewText: { color: '#4ECDC4', fontSize: 10, fontWeight: '800' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#64748b', marginTop: 15, fontSize: 14 }
});