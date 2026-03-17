import { createClient } from '@supabase/supabase-js';
import { firebaseAuth } from './firebase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  accessToken: async () => {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) return null;
    return currentUser.getIdToken(false);
  },
});
