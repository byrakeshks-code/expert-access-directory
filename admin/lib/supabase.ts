import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      // Return a placeholder that will fail gracefully at runtime
      return createClient('https://placeholder.supabase.co', 'placeholder-key');
    }

    supabaseInstance = createClient(url, key);
  }
  return supabaseInstance;
}
