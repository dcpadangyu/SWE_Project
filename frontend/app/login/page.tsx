// frontend/app/login/page.tsx
'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/utils/apiClient';
import { authStorage } from '@/utils/authStorage';

interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    fullName?: string | null;
    role?: string;
    loyaltyPoints: number;
  };
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', {
        email,
        password,
      });

      authStorage.setSession(response.accessToken, response.user);
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err?.message || 'Email hoặc mật khẩu không đúng');
    } finally {
      setLoading(false);
    }
  };

  const registerHref = `/register?redirect=${encodeURIComponent(redirectUrl)}`;

  return (
    <div className="p-4 flex flex-col justify-center min-h-[75vh]">
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
        <h1 className="text-2xl font-bold text-stone-800 text-center mb-2">
          Đăng nhập BrewLite
        </h1>
        <p className="text-sm text-stone-500 text-center mb-6">
          Đăng nhập để đặt cà phê và tích điểm thưởng
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ban@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-600 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Mật khẩu
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-600 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-amber-700 hover:bg-amber-800 disabled:bg-stone-400 text-white font-semibold text-sm transition"
          >
            {loading ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-stone-600">
          Chưa có tài khoản?{' '}
          <Link
            href={registerHref}
            className="text-amber-700 font-semibold hover:underline"
          >
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 flex justify-center items-center min-h-[50vh] text-stone-500">
          Đang tải trang đăng nhập...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
