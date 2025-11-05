// src/app/admin/sessions/page.tsx  (replace existing debug page with this)
'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/firebase/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getApp } from 'firebase/app';
import { useRouter } from 'next/navigation';

export default function AdminSessionsDebugPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawDocs, setRawDocs] = useState<any[]>([]);
  const router = useRouter();

  async function fetchSessions() {
    setError(null);
    setLoading(true);
    setRawDocs([]);
    try {
      // diagnostic logs
      try {
        const app = getApp();
        // @ts-ignore
        console.log('DEBUG: firebase app options:', app?.options || '(no app)');
        // @ts-ignore
        console.log('DEBUG: firebase projectId:', app?.options?.projectId);
      } catch (e) {
        console.warn('DEBUG: getApp() failed', e);
      }

      try {
        const auth = getAuth();
        console.log('DEBUG: auth.currentUser:', auth.currentUser);
      } catch (e) {
        console.warn('DEBUG: getAuth() failed', e);
      }

      const colRef = collection(db, 'sessions');
      const snap = await getDocs(colRef);
      console.log('DEBUG: firestore snapshot size:', snap.size);
      setRawDocs(snap.docs.map(d => ({ id: d.id, data: d.data() })));
      const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setSessions(data);
    } catch (err: any) {
      console.error('DEBUG: Firestore fetch error', err);
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // attempt immediate fetch so you can just open page
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: '0 auto' }}>
      <h1>Admin — Sessions (debug)</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => router.push('/admin/scheduler')}>Scheduler</button>
        <button onClick={() => fetchSessions()}>Fetch now</button>
        <button onClick={() => window.location.reload()}>Reload page</button>
      </div>

      <div style={{ marginBottom: 12 }}>
        {loading && <div style={{ color: '#666' }}>Loading sessions from Firestore...</div>}
        {error && <div style={{ color: 'red' }}>Error: {error}</div>}
      </div>

      <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 6, marginBottom: 12 }}>
        <h3>Sessions summary</h3>
        <div>Rendered sessions count: <strong>{sessions.length}</strong></div>
        <div style={{ marginTop: 8 }}>
          {sessions.length === 0 ? (
            <div style={{ color: '#666' }}>
              No sessions returned by Firestore.
            </div>
          ) : (
            <ul>
              {sessions.map(s => (
                <li key={s.id}>
                  <strong>{s.type ?? 'Session'}</strong> — {s.zone ?? '-'} — {s.ground ?? '-'} — {s.dateISO ? new Date(s.dateISO).toLocaleString() : 'No date'} (id: {s.id})
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div style={{ border: '1px dashed #ddd', padding: 12, borderRadius: 6 }}>
        <h3>Raw documents returned (id + data)</h3>
        {rawDocs.length === 0 ? (
          <div style={{ color: '#999' }}>No raw docs. If Firestore has documents, check project config or rules. See console for diagnostics.</div>
        ) : (
          <pre style={{ maxHeight: 300, overflow: 'auto', background: '#fafafa', padding: 8 }}>{JSON.stringify(rawDocs, null, 2)}</pre>
        )}
      </div>

      <div style={{ marginTop: 16, color: '#444' }}>
        <h4>Debug checklist</h4>
        <ol>
          <li>Open browser console (F12) before clicking <strong>Fetch now</strong>.</li>
          <li>Click <strong>Fetch now</strong> and copy the console output (all lines starting with <code>DEBUG:</code> or errors).</li>
          <li>Paste that console output here and I will tell you exactly what to change next.</li>
        </ol>
      </div>
    </div>
  );
}
