/* components/RelationshipInsights.tsx
   v2 — Real insights computed from the user's actual mediator_logs.
   No hardcoded fake analysis; every sentence shown is derived from real data.
   No AI call — cheap and instant on every home-screen render. */
   import * as _React from 'react';
   import { useEffect, useState } from 'react';
   import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
   import { MaterialCommunityIcons } from '@expo/vector-icons';
   
   import { supabase } from '../src/lib/supabase';
   
   // ── helpers ─────────────────────────────────────────────────
   
   type LogRow = { created_at: string };
   
   function timeBucket(date: Date): 'morning' | 'afternoon' | 'evening' | 'late-night' {
     const h = date.getHours();
     if (h >= 5 && h < 12) return 'morning';
     if (h >= 12 && h < 17) return 'afternoon';
     if (h >= 17 && h < 22) return 'evening';
     return 'late-night';
   }
   
   const BUCKET_LABEL: Record<string, string> = {
     'morning': 'in the morning',
     'afternoon': 'in the afternoon',
     'evening': 'in the evening',
     'late-night': 'late at night',
   };
   
   function daysBetween(a: Date, b: Date): number {
     return Math.floor(Math.abs(a.getTime() - b.getTime()) / 86400000);
   }
   
   /** Build an honest insight string from real session timestamps. */
   function buildInsight(logs: LogRow[]): string {
     const dates = logs.map(l => new Date(l.created_at));
     const total = dates.length;
     const newest = dates[0];
     const daysSinceLast = daysBetween(new Date(), newest);
   
     // Most common time of day across sessions
     const counts: Record<string, number> = {};
     for (const d of dates) {
       const b = timeBucket(d);
       counts[b] = (counts[b] || 0) + 1;
     }
     const [topBucket, topCount] = Object.entries(counts).sort((x, y) => y[1] - x[1])[0];
   
     const parts: string[] = [];
   
     parts.push(`You've completed ${total} mediation session${total === 1 ? '' : 's'} together.`);
   
     // Only claim a time-of-day pattern if it actually dominates (>= half of sessions)
     if (total >= 3 && topCount >= Math.ceil(total / 2)) {
       parts.push(`Most of your conflicts surface ${BUCKET_LABEL[topBucket]} — knowing your storm hours is the first step to catching them early.`);
     }
   
     if (daysSinceLast === 0) {
       parts.push(`You worked through something today — showing up is the hard part, and you both did.`);
     } else if (daysSinceLast >= 7) {
       parts.push(`It's been ${daysSinceLast} days since your last mediation. Quiet stretches like this are worth noticing — and protecting.`);
     } else {
       parts.push(`Your last session was ${daysSinceLast} day${daysSinceLast === 1 ? '' : 's'} ago.`);
     }
   
     parts.push(`Run the Cycle Breaker to see the deeper pattern.`);
   
     return parts.join(' ');
   }
   
   // ── component ───────────────────────────────────────────────
   
   export default function RelationshipInsights() {
     const [insight, setInsight] = useState<string>('');
     const [loading, setLoading] = useState(true);
   
     useEffect(() => {
       const generateInsight = async () => {
         try {
           const { data: userData } = await supabase.auth.getUser();
           const userId = userData?.user?.id;
           if (!userId) {
             setInsight('Sign in to start tracking your shared patterns.');
             return;
           }
   
           const { data: logs, error } = await supabase
             .from('mediator_logs')
             .select('created_at')
             .eq('user_id', userId)
             .order('created_at', { ascending: false })
             .limit(30);
   
           if (error || !logs || logs.length < 3) {
             const count = logs?.length || 0;
             setInsight(
               `Complete ${3 - count} more mediation session${3 - count === 1 ? '' : 's'} and your shared patterns will start appearing here.`
             );
             return;
           }
   
           setInsight(buildInsight(logs));
         } catch (_e) {
           setInsight('Your patterns will appear here after a few mediation sessions.');
         } finally {
           setLoading(false);
         }
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