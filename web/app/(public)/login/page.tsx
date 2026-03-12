'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth, getRoleDashboard } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input, PasswordInput } from '@/components/ui/input';
import { PageTransition } from '@/components/shared/page-transition';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, Lock, Phone, Sparkles, Shield, CheckCircle } from 'lucide-react';

type AuthMode = 'email' | 'phone';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Skeleton className="h-96 w-96 rounded-2xl" /></div>}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const { login, loginWithGoogle, loginWithPhone, verifyOtp, profile, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');

  const [mode, setMode] = useState<AuthMode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && user && profile) {
      const dest = redirectParam || getRoleDashboard(profile.role);
      router.replace(dest);
    }
  }, [authLoading, user, profile, redirectParam, router]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (!otpSent) {
        await loginWithPhone(phone);
        setOtpSent(true);
      } else {
        await verifyOtp(phone, otp);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google login failed');
    }
  };

  return (
    <PageTransition>
      <div className="min-h-[calc(100vh-4rem)] flex relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/8 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/8 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

        {/* Left panel — branding (hidden on mobile) */}
        <div className="hidden lg:flex flex-1 items-center justify-center relative p-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-md"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-8 shadow-lg shadow-primary/25">
              <span className="text-white font-extrabold text-xl">EA</span>
            </div>
            <h2 className="text-3xl font-extrabold text-foreground leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Connect with verified experts
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> for any query</span>
            </h2>
            <p className="text-muted mt-4 leading-relaxed">
              Get direct access to professionals across legal, tech, finance, health and more. Pay once, get expert advice.
            </p>
            <div className="mt-8 space-y-3">
              {[
                { icon: Shield, text: 'Verified experts only' },
                { icon: CheckCircle, text: 'Refund protection guaranteed' },
                { icon: Sparkles, text: 'Response within 24 hours' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3 text-sm text-muted">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  {item.text}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right panel — form */}
        <div className="flex-1 flex items-center justify-center relative px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            {/* Mobile-only logo */}
            <div className="text-center mb-8 lg:hidden">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/25">
                <span className="text-white font-bold">EA</span>
              </div>
            </div>

            <div className="text-center lg:text-left mb-8">
              <h1 className="text-2xl font-extrabold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Welcome back
              </h1>
              <p className="text-muted mt-1">Log in to your account</p>
            </div>

            <div className="bg-surface-elevated border border-border rounded-2xl p-6 sm:p-8 shadow-xl shadow-primary/5">
              {/* Mode toggle */}
              <div className="flex gap-0.5 p-1 bg-surface border border-border rounded-xl mb-6">
                <button
                  onClick={() => { setMode('email'); setError(''); }}
                  className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                    mode === 'email' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-foreground'
                  }`}
                >
                  Email
                </button>
                <button
                  onClick={() => { setMode('phone'); setError(''); }}
                  className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                    mode === 'phone' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-foreground'
                  }`}
                >
                  Phone
                </button>
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 bg-error-light border border-error/20 rounded-xl text-sm text-error">
                  {error}
                </div>
              )}

              {mode === 'email' ? (
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} leftIcon={<Mail className="w-4 h-4" />} required />
                  <PasswordInput label="Password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} leftIcon={<Lock className="w-4 h-4" />} required />
                  <Button type="submit" isLoading={isLoading} className="w-full">Log in</Button>
                </form>
              ) : (
                <form onSubmit={handlePhoneLogin} className="space-y-4">
                  <Input label="Phone Number" type="tel" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} leftIcon={<Phone className="w-4 h-4" />} disabled={otpSent} required />
                  {otpSent && (
                    <Input label="OTP" type="text" placeholder="Enter 6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} required />
                  )}
                  <Button type="submit" isLoading={isLoading} className="w-full">{otpSent ? 'Verify OTP' : 'Send OTP'}</Button>
                </form>
              )}

              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted font-medium">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <Button variant="outline" onClick={handleGoogleLogin} className="w-full">
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </Button>

              <p className="text-center text-sm text-muted mt-6">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-primary font-semibold hover:underline">Sign up</Link>
              </p>

              <div className="mt-4 pt-4 border-t border-border text-center">
                <p className="text-xs text-muted">Want to offer your expertise?</p>
                <Link href="/register/expert" className="text-sm text-secondary font-semibold hover:underline">
                  Sign up as an Expert
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
