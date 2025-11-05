// src/app/team/players/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  deleteDoc,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';
import Link from 'next/link';

type Player = {
  id: string;
  name?: string;
  age?: number;
  aadhaar?: string | null;
  phone?: string | null;
  preferredRole?: string | null;
  teamId?: string | null;
  createdAt?: any;
  teamName?: string | null;
};

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamsMap, setTeamsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [qText, setQText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlayersAndTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPlayersAndTeams() {
    setLoading(true);
    setError(null);
    try {
      // load teams first (to show team names)
      const teamsSnap = await getDocs(collection(db, 'teams'));
      const map: Record<string, string> = {};
      teamsSnap.forEach(t => {
        const d = t.data() as any;
        map[t.id] = d?.name || 'Unnamed team';
      });
      setTeamsMap(map);

      // load players
      // if many players, consider pagination
      const playersSnap = await getDocs(query(collection(db, 'players'), orderBy('createdAt', 'desc')));
      const arr: Player[] = playersSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      // attach teamName
      for (const p of arr) {
        if (p.teamId) p.teamName = map[p.teamId] ?? 'Unknown';
      }
      setPlayers(arr);
    } catch (err: any) {
      console.error('load players error', err);
      setError(err?.message || 'Failed to load players');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const t = qText.trim().toLowerCase();
    if (!t) return players;
    return players.filter(p =>
      String(p.name ?? '').toLowerCase().includes(t) ||
      String(p.phone ?? '').toLowerCase().includes(t) ||
      String(p.teamName ?? '').toLowerCase().includes(t) ||
      String(p.aadhaar ?? '').toLowerCase().includes(t)
    );
  }, [players, qText]);

  async function handleDelete(playerId: string) {
    if (!confirm('Delete this player? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'players', playerId));
      setPlayers((s) => s.filter(p => p.id !== playerId));
    } catch (err: any) {
      console.error('delete error', err);
      alert('Delete failed: ' + (err?.message || 'unknown'));
    }
  }

  return (
    <div style={{ padding: 12, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h2>Players</h2>
        <div>
          <Link href="/team/register"><button>Register Team (add players)</button></Link>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <input
          placeholder="Search by name, phone, aadhaar or team..."
          value={qText}
          onChange={(e) => setQText(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #ddd' }}
        />
      </div>

      {loading && <div style={{ marginTop: 12 }}>Loading players...</div>}
      {error && <div style={{ color: 'red', marginTop: 12 }}>{error}</div>}

      <div style={{ marginTop: 16 }}>
        {filtered.length === 0 && !loading ? (
          <div>No players found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: 8 }}>#</th>
                <th style={{ padding: 8 }}>Name</th>
                <th style={{ padding: 8 }}>Age</th>
                <th style={{ padding: 8 }}>Team</th>
                <th style={{ padding: 8 }}>Phone</th>
                <th style={{ padding: 8 }}>Aadhaar</th>
                <th style={{ padding: 8 }}>Role</th>
                <th style={{ padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: 8 }}>{idx + 1}</td>
                  <td style={{ padding: 8 }}>{p.name}</td>
                  <td style={{ padding: 8 }}>{p.age}</td>
                  <td style={{ padding: 8 }}>{p.teamName ?? p.teamId ?? '-'}</td>
                  <td style={{ padding: 8 }}>{p.phone ?? '-'}</td>
                  <td style={{ padding: 8 }}>{p.aadhaar ?? '-'}</td>
                  <td style={{ padding: 8 }}>{p.preferredRole ?? '-'}</td>
                  <td style={{ padding: 8 }}>
                    <button onClick={() => handleDelete(p.id)} style={{ marginRight: 8 }}>Delete</button>
                    {/* future: add Edit page link */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 18, color: '#555' }}>
        Showing {filtered.length} of {players.length} players.
      </div>
    </div>
  );
}

