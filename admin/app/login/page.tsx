'use client';

import { useState, useEffect, Suspense } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-400">Loading...</p></div>}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      api
        .get<{ role: string }>('/users/me')
        .then((user) => {
          const role = (user as any)?.role ?? (user as any)?.data?.role;
          if (role === 'admin') {
            router.replace(redirectPath);
          }
        })
        .catch(() => {
          localStorage.removeItem('admin_token');
        });
    }
  }, [router, redirectPath]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = getSupabase();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (data.session) {
        localStorage.setItem('admin_token', data.session.access_token);

        const user = await api.get<{ role: string }>('/users/me');
        const role = (user as any)?.role ?? (user as any)?.data?.role;

        if (role !== 'admin') {
          localStorage.removeItem('admin_token');
          await supabase.auth.signOut();
          setError('Access denied. Admin credentials required.');
          return;
        }

        router.push(redirectPath);
      }
    } catch {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 text-center">
            Admin Login
          </h1>
          <p className="text-sm text-gray-500 text-center mt-2 mb-8">
            Expert Access Directory
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
