// src/app/admin/layout.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { auth } from '@/firebase/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const router = useRouter();
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace('/auth/login');
        return;
      }

      const userEmail = u.email?.toLowerCase() || '';
      if (userEmail === adminEmail) {
        setAllowed(true);
      } else {
        router.replace('/');
      }
      setChecking(false);
    });

    return () => unsub();
  }, [router, adminEmail]);

  if (checking) return <div style={{ padding: 40 }}>Checking admin access...</div>;
  if (!allowed) return null;

  return (
    <div style={{ padding: 16 }}>
      <h2>Admin Dashboard Area</h2>
      <div>{children}</div>
    </div>
  );
}
