/* src/lib/analyzeRelationshipPatterns.ts */

// PROD-READY: Added mandatory .ts extension for Deno module resolution
import { supabase } from './supabase';

// FIXED: Defined interface for logs to clear implicit-any warnings in the .map() function
interface MediatorLog {
  user_perspective: string;
  partner_perspective: string;
  created_at: string;
}

export const analyzeRelationshipPatterns = async (userId: string) => {
  // 1. Fetch the last 5 logs
  const { data: logs, error } = await supabase
    .from('mediator_logs')
    .select('user_perspective, partner_perspective, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error || !logs || logs.length < 3) {
    return "I'm still gathering data. Once we have at least three sessions logged, I can start identifying our shared patterns.";
  }

  // 2. Format the logs into a readable string for Claude-haiku-4-5
  // FIXED: Explicitly typed 'log' to resolve binding element implicit-any
  const formattedLogs = (logs as MediatorLog[]).map((log: MediatorLog, index: number) => (
    `Log ${index + 1}:
     User said: "${log.user_perspective}"
     Partner said: "${log.partner_perspective}"`
  )).join('\n\n');

  // 3. This string is what you send to your Claude API endpoint
  const systemPrompt = `You are a neutral Relationship Analyst. Identify one recurring theme in these logs. Speak in first person. No lecturing. Keep it to 2-3 sentences.`;
  
  const fullPrompt = `${systemPrompt}\n\nHere are the logs:\n${formattedLogs}`;

  // 4. Call your API (Claude-4.5-Haiku)
  // [Insert your existing API call logic here using fullPrompt]
  
  return fullPrompt; // Return this for testing or pass to your AI handler
};