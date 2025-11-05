'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const router = useRouter();

  async function loadSessions() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'sessions'));
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSessions(arr);
    } catch (err) {
      console.error('load sessions error', err);
      alert('Failed to load sessions: ' + String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSessions(); }, []);

  async function handleDelete(id: string) {
    if (!confirm('Delete this session?')) return;
    setBusyId(id);
    try {
      await deleteDoc(doc(db, 'sessions', id));
      setSessions(s => s.filter(x => x.id !== id));
    } catch (err) {
      console.error('delete error', err);
      alert('Delete failed: ' + String(err));
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    const t = q.toLowerCase();
    if (!t) return sessions;
    return sessions.filter(s =>
      `${s.zone ?? ''} ${s.ground ?? ''} ${s.type ?? ''} ${s.notes ?? ''}`.toLowerCase().includes(t)
    );
  }, [sessions, q]);

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: '0 auto' }}>
      <h1>Admin — Sessions</h1>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <input
          placeholder="Search zone / ground / type / notes"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ padding: 8, width: 400 }}
        />
        <div>
          <button onClick={loadSessions} style={{ marginRight: 8 }}>Refresh</button>
          <button onClick={() => router.push('/admin/scheduler')}>Add Session</button>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        {loading ? (
          <div>Loading...</div>
        ) : filtered.length === 0 ? (
          <div>No sessions found.</div>
        ) : (
          filtered.map((s) => (
            <div key={s.id} style={{ border: '1px solid #ccc', padding: 10, marginBottom: 8, borderRadius: 6 }}>
              <b>{s.type ?? 'Trial'} — {s.zone ?? '-'}</b>
              <div>{s.ground}</div>
              <div>{s.dateISO ? new Date(s.dateISO).toLocaleString() : 'Date not set'}</div>
              <div>{s.notes ?? ''}</div>
              <div style={{ marginTop: 6 }}>
                <Link href={`/admin/sessions/${s.id}`}><button>Open</button></Link>
                <button
                  style={{ marginLeft: 8, color: 'red' }}
                  onClick={() => handleDelete(s.id)}
                  disabled={busyId === s.id}
                >
                  {busyId === s.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
