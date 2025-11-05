// src/app/layout.tsx
'use client';

import './globals.css';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { auth } from '@/firebase/firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [checked, setChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    console.log('[layout] mounting - auth object:', auth);
    const unsub = onAuthStateChanged(auth, (user) => {
      console.log('[layout] onAuthStateChanged ->', user);
      setUserInfo(user ? { uid: user.uid, email: user.email } : null);
      setChecked(true);
    }, (err) => {
      console.error('[layout] onAuthStateChanged error', err);
      setChecked(true);
    });

    return () => {
      unsub();
      console.log('[layout] unsubscribed');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    try {
      await signOut(auth);
      console.log('[layout] signed out');
      setUserInfo(null);
      router.push('/auth/login');
    } catch (err) {
      console.error('[layout] signOut error', err);
    }
  }

  return (
    <html lang="en">
      <body>
        <header style={{ background: '#fff', borderBottom: '1px solid #e6e9ef' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto', padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <Link href="/"><strong>Poorwanchal PL</strong></Link>
              <nav style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Link href="/">Home</Link>
                <Link href="/leaderboard">Leaderboard</Link>
                <Link href="/team/register">Team Register</Link>
                <Link href="/team/players">Players</Link>
                <Link href="/trials">Trials</Link>
                <Link href="/all-links">All Links</Link>
                <Link href="/admin">Admin</Link>
              </nav>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 12, color: '#666' }}>
                {checked ? (
                  userInfo ? (
                    <>
                      <div>Signed in: <strong>{userInfo.email}</strong></div>
                      <div style={{ fontSize: 11, color: '#999' }}>uid: {userInfo.uid}</div>
                    </>
                  ) : (
                    <div>Not signed in</div>
                  )
                ) : (
                  <div>Checking auth...</div>
                )}
              </div>

              {userInfo ? (
                <button onClick={handleLogout} style={{ padding: '6px 10px' }}>
                  Logout
                </button>
              ) : (
                <Link href="/auth/login"><button style={{ padding: '6px 10px' }}>Login</button></Link>
              )}
            </div>
          </div>
        </header>

        <main style={{ maxWidth: 1000, margin: '24px auto', padding: 12 }}>
          {children}
        </main>

        <footer style={{ textAlign: 'center', padding: 16, color: '#374151' }}>
          © {new Date().getFullYear()} Poorwanchal PL
        </footer>
      </body>
    </html>
  );
}
