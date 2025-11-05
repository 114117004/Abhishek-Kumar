// src/app/trials/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';
import Link from 'next/link';

type Session = {
  id: string;
  type?: string;
  zone?: string;
  ground?: string;
  dateISO?: string | null;
  maxPlayers?: number | null;
  teamAId?: string | null;
  teamBId?: string | null;
  notes?: string | null;
};

export default function TrialsListPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [zoneFilter, setZoneFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const nowISO = new Date().toISOString();
      // show upcoming sessions (dateISO >= now) OR all if date missing
      const snap = await getDocs(query(collection(db, 'sessions'), orderBy('dateISO', 'asc')));
      const arr: Session[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      // filter upcoming
      const filteredUpcoming = arr.filter(s => {
        if (!s.dateISO) return true;
        return s.dateISO >= nowISO;
      });
      setSessions(filteredUpcoming);
    } catch (err: any) {
      console.error('load sessions error', err);
      setError(err?.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }

  const zones = Array.from(new Set(sessions.map(s => (s.zone || '').trim()).filter(Boolean)));

  const visible = sessions.filter(s => {
    if (!zoneFilter) return true;
    return (s.zone || '').toLowerCase() === zoneFilter.toLowerCase();
  });

  return (
    <div style={{ padding: 12, maxWidth: 1000, margin: '0 auto' }}>
      <h2>Upcoming Sessions (Trials & Matches)</h2>
      <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <label>
          Filter zone:
          <select value={zoneFilter} onChange={(e)=>setZoneFilter(e.target.value)} style={{ marginLeft: 8 }}>
            <option value=''>All</option>
            {zones.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </label>
        <button onClick={load} style={{ marginLeft: 'auto' }}>Refresh</button>
      </div>

      {loading && <div style={{ marginTop: 12 }}>Loading sessions...</div>}
      {error && <div style={{ marginTop: 12, color: 'red' }}>{error}</div>}

      <div style={{ marginTop: 12 }}>
        {visible.length === 0 ? (
          <div>No upcoming sessions found.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {visible.map(s => (
              <div key={s.id} style={{ border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{s.type?.toUpperCase() ?? 'SESSION' } — {s.zone ?? '-'}</div>
                    <div style={{ fontSize: 13, color: '#555' }}>{s.ground ?? '-'}</div>
                    <div style={{ fontSize: 13, color: '#444', marginTop: 6 }}>{s.dateISO ? (new Date(s.dateISO).toLocaleString()) : 'Date not set'}</div>
                    <div style={{ marginTop: 6, color: '#666' }}>Max players: {s.maxPlayers ?? 'Unlimited'}</div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <Link href={`/trials/${s.id}`}><button>Open / Signup</button></Link>
                    <div style={{ fontSize: 12, color: '#777', marginTop: 6 }}>{s.notes ?? ''}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
