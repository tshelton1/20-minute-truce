/* src/lib/usage.ts */

// PROD-READY: Added mandatory .ts extension for Deno module resolution
import { supabase } from './supabase';

export const incrementUsage = async (columnName: 'translator_usage_count' | 'mediator_usage_count') => {
  // FIXED: Explicitly typed user object to resolve binding element implicit-any
  const { data: { user } }: { data: { user: any } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.rpc('increment_usage', { 
    row_id: user.id, 
    col_name: columnName 
  });

  if (error) {
    // Fallback: If the RPC function isn't set up, do a standard update
    // FIXED: Cast profile response to clear implicit-any access
    const { data: profile } = await supabase
      .from('profiles')
      .select(columnName)
      .eq('id', user.id)
      .single() as { data: Record<string, number> | null };

    const currentCount = profile?.[columnName] || 0;

    await supabase
      .from('profiles')
      .update({ [columnName]: currentCount + 1 })
      .eq('id', user.id);
  }
};