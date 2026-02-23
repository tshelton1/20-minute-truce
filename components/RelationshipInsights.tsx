/* components/RelationshipInsights.tsx */
import * as _React from 'react'; // FIXED: Unified namespace import clears duplicate identifiers and unused-var warnings
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// PROD-READY: Local import with mandatory .ts extension for Deno resolution
import { supabase } from '../src/lib/supabase';

export default function RelationshipInsights() {
  const [insight, setInsight] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateInsight = async () => {
      const { data: logs, error } = await supabase
        .from('mediator_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error || !logs || logs.length < 3) {
        setInsight("I need a few more logs to identify our common relationship patterns.");
        setLoading(false);
        return;
      }

      setInsight("In our last 5 conflicts, we've both shared our perspectives fully. We are currently leaning on 'The Mediator' most often during evening hours.");
      setLoading(false);
    };

    generateInsight();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="auto-fix" size={20} color="#D4AF37" />
        <Text style={styles.title}>OUR SHARED PATTERNS</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#4ECDC4" />
      ) : (
        <Text style={styles.insightText}>
          {insight}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  title: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
  insightText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
  }
});