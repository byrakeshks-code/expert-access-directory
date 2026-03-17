'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  RecaptchaVerifier,
  type User as FirebaseUser,
  type ConfirmationResult,
} from 'firebase/auth';
import { firebaseAuth } from './firebase';
import { api } from './api';

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
  user: FirebaseUser | null;
  profile: UserProfile | null;
  expertProfile: ExpertProfile | null;
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
  updateUserProfile: (data: { full_name?: string; email?: string; phone?: string }) => Promise<void>;
  setupRecaptcha: (containerId: string) => void;
}

const ROLE_STORAGE_KEY = 'ea_user_role';

const AuthContext = createContext<AuthContextValue | null>(null);

const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [expertProfile, setExpertProfile] = useState<ExpertProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const fetchProfile = useCallback(async (token: string) => {
    try {
      localStorage.setItem('auth_token', token);
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
    const unsubscribe = onIdTokenChanged(firebaseAuth, async (fbUser) => {
      if (fbUser) {
        setUser(fbUser);
        const token = await fbUser.getIdToken();
        await fetchProfile(token);
      } else {
        setUser(null);
        setProfile(null);
        setExpertProfile(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem(ROLE_STORAGE_KEY);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [fetchProfile]);

  // Refresh the Firebase token periodically (tokens expire every hour)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      try {
        const token = await user.getIdToken(true);
        localStorage.setItem('auth_token', token);
      } catch {
        // Token refresh failed; user will be signed out on next API call
      }
    }, 50 * 60 * 1000); // Every 50 minutes

    return () => clearInterval(interval);
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
    } catch (err: any) {
      const message = firebaseErrorMessage(err.code);
      throw new Error(message);
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(firebaseAuth, googleProvider);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') return;
      throw new Error(firebaseErrorMessage(err.code));
    }
  }, []);

  const setupRecaptcha = useCallback((containerId: string) => {
    try {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    } catch { /* ignore clear errors */ }

    try {
      recaptchaVerifierRef.current = new RecaptchaVerifier(firebaseAuth, containerId, {
        size: 'invisible',
      });
    } catch (err) {
      console.warn('Failed to create RecaptchaVerifier:', err);
      recaptchaVerifierRef.current = null;
    }
  }, []);

  const loginWithPhone = useCallback(async (phone: string) => {
    // Auto-initialize reCAPTCHA if not ready
    if (!recaptchaVerifierRef.current) {
      const el = document.getElementById('recaptcha-container');
      if (el) {
        try {
          recaptchaVerifierRef.current = new RecaptchaVerifier(firebaseAuth, 'recaptcha-container', {
            size: 'invisible',
          });
        } catch {
          throw new Error('Could not initialize phone verification. Please refresh the page.');
        }
      } else {
        throw new Error('Could not initialize phone verification. Please refresh the page.');
      }
    }
    try {
      const result = await signInWithPhoneNumber(
        firebaseAuth,
        phone,
        recaptchaVerifierRef.current,
      );
      confirmationResultRef.current = result;
    } catch (err: any) {
      // Reset reCAPTCHA on failure so it can be re-created
      try { recaptchaVerifierRef.current?.clear(); } catch { /* ignore */ }
      recaptchaVerifierRef.current = null;
      throw new Error(firebaseErrorMessage(err.code));
    }
  }, []);

  const verifyOtp = useCallback(async (_phone: string, otp: string) => {
    if (!confirmationResultRef.current) {
      throw new Error('No OTP verification in progress. Please request a new OTP.');
    }
    try {
      await confirmationResultRef.current.confirm(otp);
      confirmationResultRef.current = null;
    } catch (err: any) {
      throw new Error(firebaseErrorMessage(err.code));
    }
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(
        firebaseAuth,
        email,
        password,
      );
      await updateProfile(newUser, { displayName: fullName });
      // Force token refresh to include the updated displayName
      await newUser.getIdToken(true);
    } catch (err: any) {
      throw new Error(firebaseErrorMessage(err.code));
    }
  }, []);

  const logout = useCallback(async () => {
    await firebaseSignOut(firebaseAuth);
    localStorage.removeItem('auth_token');
    localStorage.removeItem(ROLE_STORAGE_KEY);
    setUser(null);
    setProfile(null);
    setExpertProfile(null);
    confirmationResultRef.current = null;
    recaptchaVerifierRef.current = null;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const token = await user.getIdToken();
      await fetchProfile(token);
    }
  }, [user, fetchProfile]);

  const updateUserProfile = useCallback(async (data: { full_name?: string; email?: string; phone?: string }) => {
    await api.patch('/users/me', data);
    if (user) {
      const token = await user.getIdToken();
      await fetchProfile(token);
    }
  }, [user, fetchProfile]);

  const isAdmin = profile?.role === 'admin';
  const isExpert = profile?.role === 'expert';
  const isVerified = expertProfile?.verification_status === 'verified';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        expertProfile,
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
        updateUserProfile,
        setupRecaptcha,
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

function firebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters';
    case 'auth/invalid-email':
      return 'Please enter a valid email address';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/invalid-phone-number':
      return 'Please enter a valid phone number with country code (e.g. +91...)';
    case 'auth/invalid-verification-code':
      return 'Invalid OTP code. Please try again.';
    case 'auth/code-expired':
      return 'OTP has expired. Please request a new one.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    default:
      return `Authentication error (${code})`;
  }
}
