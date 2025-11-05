// src/app/admin/dashboard/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

type Counts = {
  users: number;
  teams: number;
  players: number;
  trials: number;
};

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(false);
  const [usersData, setUsersData] = useState<any[]>([]);
  const [playersData, setPlayersData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadCounts() {
    setLoading(true);
    setError(null);
    try {
      // Replace collection names if your DB uses other names
      const usersSnap = await getDocs(collection(db, 'users'));
      const teamsSnap = await getDocs(collection(db, 'teams'));
      const playersSnap = await getDocs(collection(db, 'players'));
      const trialsSnap = await getDocs(collection(db, 'trials'));

      setCounts({
        users: usersSnap.size,
        teams: teamsSnap.size,
        players: playersSnap.size,
        trials: trialsSnap.size,
      });

      // store a bit of data for exports (we limit number of fields)
      const usersArr = usersSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      const playersArr = playersSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

      setUsersData(usersArr);
      setPlayersData(playersArr);
    } catch (err: any) {
      console.error('Load counts error', err);
      setError(err?.message || 'Failed to load counts');
    } finally {
      setLoading(false);
    }
  }

  function toCSV(rows: any[], fields?: string[]) {
    if (!rows || rows.length === 0) return '';
    // if fields provided, use them; otherwise use keys from first row
    const keys = fields && fields.length ? fields : Object.keys(rows[0]);
    const header = keys.join(',');
    const lines = rows.map(r =>
      keys.map(k => {
        const v = (r[k] ?? '').toString().replace(/"/g, '""');
        // wrap in quotes if contains comma/newline
        return v.includes(',') || v.includes('\n') ? `"${v}"` : v;
      }).join(',')
    );
    return [header, ...lines].join('\n');
  }

  function downloadCSV(filename: string, rows: any[], fields?: string[]) {
    const csv = toCSV(rows, fields);
    if (!csv) {
      alert('No data to export');
      return;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportUsersPDF() {
    if (!usersData || usersData.length === 0) return alert('No users to export');
    const doc = new jsPDF();
    const columns = Object.keys(usersData[0]).map(k => ({ header: k, dataKey: k }));
    doc.text('Users export', 14, 20);
    (doc as any).autoTable({
      startY: 28,
      head: [Object.keys(usersData[0])],
      body: usersData.map(u => Object.keys(usersData[0]).map(k => u[k] ?? '')),
      styles: { fontSize: 8 },
    });
    doc.save('users-export.pdf');
  }

  function exportPlayersPDF() {
    if (!playersData || playersData.length === 0) return alert('No players to export');
    const doc = new jsPDF();
    doc.text('Players export', 14, 20);
    (doc as any).autoTable({
      startY: 28,
      head: [Object.keys(playersData[0])],
      body: playersData.map(u => Object.keys(playersData[0]).map(k => u[k] ?? '')),
      styles: { fontSize: 8 },
    });
    doc.save('players-export.pdf');
  }

  return (
    <div style={{ padding: 12 }}>
      <h2>Admin Dashboard</h2>

      {loading && <div>Loading counts...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}

      {counts && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 12 }}>
          <StatCard label="Users" value={counts.users} />
          <StatCard label="Teams" value={counts.teams} />
          <StatCard label="Players" value={counts.players} />
          <StatCard label="Trials" value={counts.trials} />
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <h3>Exports</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => downloadCSV('users-export.csv', usersData)}>Export Users CSV</button>
          <button onClick={exportUsersPDF}>Export Users PDF</button>

          <div style={{ width: 20 }} />

          <button onClick={() => downloadCSV('players-export.csv', playersData)}>Export Players CSV</button>
          <button onClick={exportPlayersPDF}>Export Players PDF</button>
        </div>

        <p style={{ marginTop: 10, color: '#666' }}>
          CSV export is simple client-side export. PDF uses jsPDF + autoTable.
        </p>
      </div>

      <div style={{ marginTop: 20 }}>
        <button onClick={loadCounts}>Refresh counts</button>
      </div>
    </div>
  );
}

// small stat card component
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #e6e9ef' }}>
      <div style={{ fontSize: 12, color: '#666' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
