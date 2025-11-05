'use client';

import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';
import { useRouter } from 'next/navigation';
import { showToast } from '@/lib/showToast'; // ✅ Toast for success/failure messages

type Team = { id: string; teamName?: string; zone?: string };

export default function AdminSchedulerPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  // form state
  const [type, setType] = useState('Trial');
  const [zone, setZone] = useState('');
  const [ground, setGround] = useState('');
  const [dateLocal, setDateLocal] = useState(''); // yyyy-mm-ddThh:MM
  const [maxPlayers, setMaxPlayers] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadTeams();
  }, []);

  async function loadTeams() {
    setLoadingTeams(true);
    try {
      const snap = await getDocs(collection(db, 'teams'));
      const arr = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Team[];
      setTeams(arr);
    } catch (err) {
      console.error('load teams error', err);
      showToast('Failed to load teams');
    } finally {
      setLoadingTeams(false);
    }
  }

  function isoFromLocal(localStr: string) {
    if (!localStr) return null;
    const dt = new Date(localStr);
    return dt.toISOString();
  }

  async function handleCreate(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!zone.trim()) return showToast('Please enter zone');
    if (!ground.trim()) return showToast('Please enter ground name');
    if (!dateLocal) return showToast('Please set date/time');
    setSubmitting(true);

    const payload: any = {
      type: type || 'Trial',
      zone: zone.trim(),
      ground: ground.trim(),
      dateISO: isoFromLocal(dateLocal),
      maxPlayers: maxPlayers === '' ? null : Number(maxPlayers),
      notes: notes.trim() || null,
      createdAt: serverTimestamp(),
    };

    try {
      // ✅ Always create session at top-level
      await addDoc(collection(db, 'sessions'), payload);
      showToast('✅ Session created successfully!');
      router.push('/admin/sessions');
    } catch (err) {
      console.error('create session error', err);
      showToast('❌ Create failed, check console');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      <h1>Admin — Scheduler (Create Session)</h1>

      <form onSubmit={handleCreate} style={{ display: 'grid', gap: 12, marginTop: 12 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 6 }}>Type</label>
            <input
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{ padding: 8, width: '100%' }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 6 }}>Zone</label>
            <input
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              style={{ padding: 8, width: '100%' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 6 }}>Ground name</label>
            <input
              value={ground}
              onChange={(e) => setGround(e.target.value)}
              style={{ padding: 8, width: '100%' }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 6 }}>Date & time</label>
            <input
              type="datetime-local"
              value={dateLocal}
              onChange={(e) => setDateLocal(e.target.value)}
              style={{ padding: 8, width: '100%' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ width: 160 }}>
            <label style={{ display: 'block', marginBottom: 6 }}>Max players</label>
            <input
              type="number"
              min={0}
              value={maxPlayers as any}
              onChange={(e) =>
                setMaxPlayers(e.target.value === '' ? '' : Number(e.target.value))
              }
              style={{ padding: 8, width: '100%' }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 6 }}>Notes</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ padding: 8, width: '100%' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="submit"
            disabled={submitting}
            style={{ padding: '8px 14px' }}
          >
            {submitting ? 'Creating...' : 'Create session'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/sessions')}
            style={{ padding: '8px 14px' }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
