// frontend/app/register/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/utils/apiClient';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      await apiClient.post('/auth/register', {
        email,
        password,
        fullName: fullName.trim() || undefined,
      });

      setSuccessMsg('Đăng ký tài khoản thành công! Đang chuyển sang trang đăng nhập...');
      setTimeout(() => {
        router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Dữ liệu đăng ký không hợp lệ hoặc email đã tồn tại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 flex flex-col justify-center min-h-[75vh]">
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
        <h1 className="text-2xl font-bold text-stone-800 text-center mb-2">
          Tạo tài khoản mới
        </h1>
        <p className="text-sm text-stone-500 text-center mb-6">
          Nhận ngay ưu đãi và tích điểm thưởng cùng BrewLite
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Họ và tên (Tùy chọn)
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-600 text-sm"
            />
          </div>

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
              Mật khẩu (tối thiểu 6 ký tự)
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
            {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-stone-600">
          Đã có tài khoản?{' '}
          <Link className="text-amber-700 font-semibold hover:underline" href="{`/login?redirect=${encodeURIComponent(redirectUrl)}`}">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}