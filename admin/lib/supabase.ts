import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { firebaseAuth } from './firebase';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return createClient('https://placeholder.supabase.co', 'placeholder-key');
    }

    supabaseInstance = createClient(url, key, {
      accessToken: async () => {
        const currentUser = firebaseAuth.currentUser;
        if (!currentUser) return null;
        return currentUser.getIdToken(false);
      },
    });
  }
  return supabaseInstance;
}
