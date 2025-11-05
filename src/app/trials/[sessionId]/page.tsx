// src/app/trials/[sessionId]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';
import { useParams } from 'next/navigation';
import Link from 'next/link';

type SessionDoc = {
  id: string;
  type?: string;
  zone?: string;
  ground?: string;
  dateISO?: string | null;
  maxPlayers?: number | null;
  notes?: string | null;
};

export default function SessionSignupPage() {
  const params = useParams() as { sessionId?: string };
  const sessionId = params?.sessionId || '';
  const [session, setSession] = useState<SessionDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [regs, setRegs] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', age: '', phone: '', aadhaar: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function loadSession() {
    setLoading(true);
    setError(null);
    try {
      const sRef = doc(db, 'sessions', sessionId);
      const sSnap = await getDoc(sRef);
      if (!sSnap.exists()) {
        setError('Session not found');
        setLoading(false);
        return;
      }
      const sdata = sSnap.data() as any;
      setSession({ id: sSnap.id, ...(sdata || {}) });

      // load registrations for this session
      const regSnap = await getDocs(query(collection(db, 'registrations'), where('sessionId', '==', sessionId)));
      const arr = regSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setRegs(arr);
    } catch (err: any) {
      console.error('load session error', err);
      setError(err?.message || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }

  function validateAadhaar(a: string) {
    if (!a) return true;
    return /^\d{12}$/.test(a);
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (!form.name || !form.age) return setError('Name and age are required');
    const ageNum = Number(form.age);
    if (isNaN(ageNum) || ageNum < 12) return setError('Age must be a number >= 12');
    if (form.aadhaar && !validateAadhaar(form.aadhaar)) return setError('Aadhaar must be 12 digits');

    // capacity check
    if (session?.maxPlayers && regs.length >= session.maxPlayers) {
      return setError('Session is full');
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'registrations'), {
        sessionId,
        name: form.name.trim(),
        age: ageNum,
        phone: form.phone?.trim() || null,
        aadhaar: form.aadhaar?.trim() || null,
        createdAt: serverTimestamp(),
      });
      setSuccessMsg('Registered successfully');
      setForm({ name: '', age: '', phone: '', aadhaar: '' });
      // reload regs
      const regSnap = await getDocs(query(collection(db, 'registrations'), where('sessionId', '==', sessionId)));
      const arr = regSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setRegs(arr);
    } catch (err: any) {
      console.error('signup error', err);
      setError(err?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (!sessionId) return <div style={{ padding: 12 }}>No session selected.</div>;

  return (
    <div style={{ padding: 12, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 12 }}>
        <Link href="/trials"><button>← Back to sessions</button></Link>
      </div>

      {loading && <div>Loading session...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {!loading && session && (
        <>
          <h2>{session.type?.toUpperCase() ?? 'SESSION'} — {session.zone ?? ''}</h2>
          <div style={{ color: '#444' }}>{session.ground ?? '-'}</div>
          <div style={{ color: '#444', marginTop: 6 }}>{session.dateISO ? new Date(session.dateISO).toLocaleString() : 'Date not set'}</div>
          <div style={{ marginTop: 6, color: '#666' }}>Max players: {session.maxPlayers ?? 'Unlimited'}</div>
          <div style={{ marginTop: 8 }}>{session.notes ?? ''}</div>

          <section style={{ marginTop: 18, border: '1px solid #eee', padding: 12, borderRadius: 6 }}>
            <h3>Sign up for this session</h3>
            <form onSubmit={handleSignup} style={{ display: 'grid', gap: 8 }}>
              <label>
                Name
                <input value={form.name} onChange={(e)=>setForm(f=>({...f, name:e.target.value}))} required />
              </label>

              <label>
                Age
                <input value={form.age} onChange={(e)=>setForm(f=>({...f, age:e.target.value}))} type="number" required />
              </label>

              <label>
                Phone
                <input value={form.phone} onChange={(e)=>setForm(f=>({...f, phone:e.target.value}))} />
              </label>

              <label>
                Aadhaar (optional)
                <input value={form.aadhaar} onChange={(e)=>setForm(f=>({...f, aadhaar:e.target.value}))} />
              </label>

              <div>
                <button type="submit" disabled={submitting}>{submitting ? 'Registering...' : 'Register'}</button>
              </div>

              {successMsg && <div style={{ color: 'green' }}>{successMsg}</div>}
            </form>
          </section>

          <section style={{ marginTop: 18 }}>
            <h3>Registered participants ({regs.length})</h3>
            <div style={{ maxHeight: 260, overflow: 'auto', border: '1px solid #f0f0f0', padding: 8 }}>
              {regs.length === 0 ? <div>No participants yet</div> : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <th style={{ padding: 8 }}>#</th>
                      <th style={{ padding: 8 }}>Name</th>
                      <th style={{ padding: 8 }}>Age</th>
                      <th style={{ padding: 8 }}>Phone</th>
                      <th style={{ padding: 8 }}>Aadhaar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regs.map((r, i) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #fafafa' }}>
                        <td style={{ padding: 8 }}>{i+1}</td>
                        <td style={{ padding: 8 }}>{r.name}</td>
                        <td style={{ padding: 8 }}>{r.age}</td>
                        <td style={{ padding: 8 }}>{r.phone ?? '-'}</td>
                        <td style={{ padding: 8 }}>{r.aadhaar ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
