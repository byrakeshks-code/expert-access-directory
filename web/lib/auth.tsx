'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import { api } from './api';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'expert' | 'admin';
  phone?: string;
  avatar_url?: string;
  country_code?: string;
  timezone?: string;
  preferred_lang?: string;
  created_at: string;
}

export interface ExpertProfile {
  id: string;
  user_id: string;
  headline: string;
  bio: string;
  avatar_url?: string;
  primary_domain_id: string;
  access_fee_minor: number;
  access_fee_currency: string;
  is_available: boolean;
  verification_status: 'pending' | 'under_review' | 'verified' | 'rejected';
  current_tier: 'starter' | 'pro' | 'elite';
  avg_rating: number;
  total_reviews: number;
  years_experience: number;
}

interface AuthContextValue {
  user: SupabaseUser | null;
  profile: UserProfile | null;
  expertProfile: ExpertProfile | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  isExpert: boolean;
  isVerified: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithPhone: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const ROLE_STORAGE_KEY = 'ea_user_role';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [expertProfile, setExpertProfile] = useState<ExpertProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initDone = useRef(false);

  const fetchProfile = useCallback(async (accessToken: string) => {
    try {
      localStorage.setItem('auth_token', accessToken);
      const data = await api.get<UserProfile>('/users/me');
      setProfile(data);

      if (data.role) {
        localStorage.setItem(ROLE_STORAGE_KEY, data.role);
      }

      if (data.role === 'expert') {
        try {
          const expert = await api.get<ExpertProfile>('/experts/me');
          setExpertProfile(expert);
        } catch {
          setExpertProfile(null);
        }
      }
    } catch {
      setProfile(null);
      setExpertProfile(null);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (event === 'INITIAL_SESSION') {
          if (newSession) {
            setSession(newSession);
            setUser(newSession.user);
            await fetchProfile(newSession.access_token);
          }
          initDone.current = true;
          setIsLoading(false);
          return;
        }

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setExpertProfile(null);
          localStorage.removeItem('auth_token');
          localStorage.removeItem(ROLE_STORAGE_KEY);
          return;
        }

        if (newSession) {
          setSession(newSession);
          setUser(newSession.user);
          await fetchProfile(newSession.access_token);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw new Error(error.message);
  }, []);

  const loginWithPhone = useCallback(async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw new Error(error.message);
  }, []);

  const verifyOtp = useCallback(async (phone: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    if (error) throw new Error(error.message);
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw new Error(error.message);
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('auth_token');
    localStorage.removeItem(ROLE_STORAGE_KEY);
    setUser(null);
    setSession(null);
    setProfile(null);
    setExpertProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session) {
      await fetchProfile(session.access_token);
    }
  }, [session, fetchProfile]);

  const isAdmin = profile?.role === 'admin';
  const isExpert = profile?.role === 'expert';
  const isVerified = expertProfile?.verification_status === 'verified';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        expertProfile,
        session,
        isLoading,
        isAdmin,
        isExpert,
        isVerified,
        login,
        loginWithGoogle,
        loginWithPhone,
        verifyOtp,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

/** Read the last-known user role from localStorage (survives hard refresh) */
export function getSavedRole(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ROLE_STORAGE_KEY);
}

/** Return the correct dashboard path for a given role */
export function getRoleDashboard(role: string | null | undefined): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'expert':
      return '/expert/dashboard';
    default:
      return '/dashboard';
  }
}
