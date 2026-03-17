'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input, PasswordInput } from '@/components/ui/input';
import { PageTransition } from '@/components/shared/page-transition';
import { Mail, Lock, User, Shield, CheckCircle, Sparkles } from 'lucide-react';

export default function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setIsLoading(true);
    try {
      await register(email, password, fullName);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try { await loginWithGoogle(); } catch (err: any) { setError(err.message || 'Google signup failed'); }
  };

  if (success) {
    return (
      <PageTransition>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-surface-elevated border border-border rounded-2xl max-w-md w-full p-8 text-center shadow-xl">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-xl font-extrabold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Check your email</h2>
            <p className="text-muted mt-2 text-sm">
              We&apos;ve sent a verification link to <strong className="text-foreground">{email}</strong>. Click the link to activate your account.
            </p>
            <Link href="/login" className="mt-6 inline-block">
              <Button variant="outline">Back to Login</Button>
            </Link>
          </motion.div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-[calc(100vh-4rem)] flex relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-bl from-primary/5 via-background to-secondary/5" />
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-secondary/8 rounded-full blur-3xl -translate-y-1/3 -translate-x-1/4" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/8 rounded-full blur-3xl translate-y-1/3 translate-x-1/4" />

        {/* Left panel — branding */}
        <div className="hidden lg:flex flex-1 items-center justify-center relative p-12">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="max-w-md">
            <img src="/logo.png" alt="Loop Ex" className="w-14 h-14 rounded-2xl object-contain mb-8 shadow-lg shadow-primary/25" />
            <h2 className="text-3xl font-extrabold text-foreground leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Join thousands of
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> professionals</span>
            </h2>
            <p className="text-muted mt-4 leading-relaxed">
              Create your free account and start connecting with verified experts in minutes.
            </p>
            <div className="mt-8 space-y-3">
              {[
                { icon: Shield, text: 'Free to join, pay per access' },
                { icon: CheckCircle, text: '500+ verified experts' },
                { icon: Sparkles, text: 'Instant access after payment' },
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
            <div className="text-center lg:text-left mb-8 lg:hidden">
              <img src="/logo.png" alt="Loop Ex" className="w-12 h-12 rounded-xl object-contain mx-auto mb-4 shadow-lg shadow-primary/25" />
            </div>

            <div className="text-center lg:text-left mb-8">
              <h1 className="text-2xl font-extrabold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Create your account</h1>
              <p className="text-muted mt-1">Start finding experts today</p>
            </div>

            <div className="bg-surface-elevated border border-border rounded-2xl p-6 sm:p-8 shadow-xl shadow-primary/5">
              {error && (
                <div className="mb-4 px-4 py-3 bg-error-light border border-error/20 rounded-xl text-sm text-error">{error}</div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <Input label="Full Name" type="text" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} leftIcon={<User className="w-4 h-4" />} required />
                <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} leftIcon={<Mail className="w-4 h-4" />} required />
                <PasswordInput label="Password" placeholder="Minimum 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} leftIcon={<Lock className="w-4 h-4" />} required />
                <PasswordInput label="Confirm Password" placeholder="Re-enter your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} leftIcon={<Lock className="w-4 h-4" />} required />
                <Button type="submit" isLoading={isLoading} className="w-full">Create Account</Button>
              </form>

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
                Already have an account?{' '}
                <Link href="/login" className="text-primary font-semibold hover:underline">Log in</Link>
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
