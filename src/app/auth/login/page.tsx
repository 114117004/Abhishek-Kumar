// src/app/auth/login/page.tsx
'use client';

import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, form.email, form.password);
      setLoading(false);
      router.push('/');
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Login failed');
    }
  }

  return (
    <div style={{ maxWidth: 540, margin: '24px auto' }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10 }}>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
            required
          />
        </label>

        <div>
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>

        {error && <div style={{ color: 'red' }}>{error}</div>}

        <div style={{ marginTop: 8 }}>
          No account? <Link href="/auth/signup">Create one</Link>
        </div>
      </form>
    </div>
  );
}
