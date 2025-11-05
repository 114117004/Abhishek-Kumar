// src/app/admin/checkedin/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';

type Player = {
  id: string;
  name?: string;
  teamId?: string;
  teamName?: string;
  checkedIn?: boolean;
  phone?: string | null;
  aadhaar?: string | null;
};

export default function AdminCheckedIn() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamsMap, setTeamsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // load teams to show team names
      const teamsSnap = await getDocs(collection(db, 'teams'));
      const map: Record<string, string> = {};
      teamsSnap.forEach(t => {
        const d = t.data() as any;
        map[t.id] = d?.name || 'Unnamed team';
      });
      setTeamsMap(map);

      // load players, order by checkedIn desc then name
      const playersSnap = await getDocs(query(collection(db, 'players'), orderBy('checkedIn', 'desc')));
      const arr: Player[] = playersSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      for (const p of arr) {
        if (p.teamId) p.teamName = map[p.teamId] ?? 'Unknown';
      }
      setPlayers(arr);
    } catch (err: any) {
      console.error('load checkedin error', err);
      setError(err?.message || 'Failed to load players');
    } finally {
      setLoading(false);
    }
  }

  async function toggleCheck(playerId: string, current: boolean | undefined) {
    try {
      const ref = doc(db, 'players', playerId);
      await updateDoc(ref, { checkedIn: !current });
      setPlayers((s) => s.map(p => (p.id === playerId ? { ...p, checkedIn: !current } : p)));
    } catch (err: any) {
      console.error('toggle check error', err);
      alert('Failed to update checked status: ' + (err?.message || 'unknown'));
    }
  }

  return (
    <div style={{ padding: 12, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Checked-in Management</h2>
        <div>
          <button onClick={load}>Refresh</button>
        </div>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}

      <div style={{ marginTop: 12 }}>
        {players.length === 0 ? (
          <div>No players found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: 8 }}>#</th>
                <th style={{ padding: 8 }}>Name</th>
                <th style={{ padding: 8 }}>Team</th>
                <th style={{ padding: 8 }}>Phone</th>
                <th style={{ padding: 8 }}>Aadhaar</th>
                <th style={{ padding: 8 }}>Checked</th>
              </tr>
            </thead>

            <tbody>
              {players.map((p, idx) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: 8 }}>{idx + 1}</td>
                  <td style={{ padding: 8 }}>{p.name}</td>
                  <td style={{ padding: 8 }}>{p.teamName ?? '-'}</td>
                  <td style={{ padding: 8 }}>{p.phone ?? '-'}</td>
                  <td style={{ padding: 8 }}>{p.aadhaar ?? '-'}</td>
                  <td style={{ padding: 8 }}>
                    <input
                      type="checkbox"
                      checked={!!p.checkedIn}
                      onChange={() => toggleCheck(p.id, !!p.checkedIn)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
