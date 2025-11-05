// src/app/team/register/page.tsx
'use client';

import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/navigation';

type Player = {
  name: string;
  age: string;
  aadhaar: string;
  phone: string;
  preferredRole: string;
};

export default function TeamRegisterPage() {
  const router = useRouter();
  const [teamName, setTeamName] = useState('');
  const [zone, setZone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [players, setPlayers] = useState<Player[]>([
    { name: '', age: '', aadhaar: '', phone: '', preferredRole: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updatePlayer(index: number, patch: Partial<Player>) {
    setPlayers((p) => p.map((pl, i) => (i === index ? { ...pl, ...patch } : pl)));
  }

  function addPlayerRow() {
    setPlayers((p) => [...p, { name: '', age: '', aadhaar: '', phone: '', preferredRole: '' }]);
  }

  function removePlayerRow(i: number) {
    setPlayers((p) => p.filter((_, idx) => idx !== i));
  }

  function validateAadhaar(a: string) {
    // very basic check: 12 digits
    return /^\d{12}$/.test(a);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!teamName.trim()) return setError('Team name required');
    if (!contactEmail || !/\S+@\S+\.\S+/.test(contactEmail)) return setError('Valid contact email required');

    // basic player validation
    for (let i = 0; i < players.length; i++) {
      const pl = players[i];
      if (!pl.name.trim()) return setError(`Player #${i + 1} name required`);
      if (!pl.age || isNaN(Number(pl.age)) || Number(pl.age) < 12) return setError(`Player #${i + 1} valid age required`);
      if (pl.aadhaar && !validateAadhaar(pl.aadhaar)) return setError(`Player #${i + 1} Aadhaar must be 12 digits`);
    }

    setLoading(true);
    try {
      // create team doc
      const teamRef = await addDoc(collection(db, 'teams'), {
        name: teamName.trim(),
        zone: zone.trim(),
        contactEmail: contactEmail.trim(),
        createdAt: serverTimestamp(),
      });

      // create player docs linked to team
      const createdPlayers = [];
      for (const pl of players) {
        const playerDoc = {
          teamId: teamRef.id,
          name: pl.name.trim(),
          age: Number(pl.age),
          aadhaar: pl.aadhaar || null,
          phone: pl.phone || null,
          preferredRole: pl.preferredRole || null,
          createdAt: serverTimestamp(),
        };
        const pRef = await addDoc(collection(db, 'players'), playerDoc);
        createdPlayers.push({ id: pRef.id, ...playerDoc });
      }

      setLoading(false);
      // Option: redirect to team page or show success
      router.push('/team/players');
    } catch (err: any) {
      console.error('Team register error', err);
      setError(err?.message || 'Failed to register team');
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 920, margin: '18px auto', padding: 12 }}>
      <h2>Register Team</h2>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        <label>
          Team Name
          <input value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
        </label>

        <label>
          Zone
          <input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="e.g., East, West" />
        </label>

        <label>
          Contact Email
          <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} type="email" required />
        </label>

        <div style={{ marginTop: 6 }}>
          <h3>Players</h3>
          {players.map((pl, idx) => (
            <div key={idx} style={{ border: '1px solid #e6e9ef', padding: 8, marginBottom: 8, borderRadius: 6 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <strong>Player #{idx + 1}</strong>
                {players.length > 1 && (
                  <button type="button" onClick={() => removePlayerRow(idx)} style={{ marginLeft: 'auto' }}>
                    Remove
                  </button>
                )}
              </div>

              <label>
                Name
                <input value={pl.name} onChange={(e) => updatePlayer(idx, { name: e.target.value })} required />
              </label>

              <label>
                Age
                <input value={pl.age} onChange={(e) => updatePlayer(idx, { age: e.target.value })} required />
              </label>

              <label>
                Aadhaar (12 digits)
                <input value={pl.aadhaar} onChange={(e) => updatePlayer(idx, { aadhaar: e.target.value })} />
              </label>

              <label>
                Phone
                <input value={pl.phone} onChange={(e) => updatePlayer(idx, { phone: e.target.value })} />
              </label>

              <label>
                Preferred role
                <input value={pl.preferredRole} onChange={(e) => updatePlayer(idx, { preferredRole: e.target.value })} />
              </label>
            </div>
          ))}

          <div>
            <button type="button" onClick={addPlayerRow}>Add player</button>
          </div>
        </div>

        {error && <div style={{ color: 'red' }}>{error}</div>}

        <div>
          <button type="submit" disabled={loading}>{loading ? 'Registering...' : 'Register Team'}</button>
        </div>
      </form>
    </div>
  );
}
