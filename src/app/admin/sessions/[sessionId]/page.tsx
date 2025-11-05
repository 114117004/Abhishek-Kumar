'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, updateDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';
import Link from 'next/link';

type Registration = {
  id: string;
  name: string;
  age?: number;
  phone?: string | null;
  aadhaar?: string | null;
  createdAt?: any;
  approved?: boolean;
  sessionId?: string;
};

export default function AdminSessionRegsPage() {
  const params = useParams() as { sessionId?: string };
  const sessionId = params?.sessionId ?? '';
  const router = useRouter();

  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});

  useEffect(() => { if (sessionId) loadRegs(); }, [sessionId]);

  async function loadRegs() {
    setLoading(true);
    try {
      const q = query(collection(db, 'registrations'), where('sessionId', '==', sessionId), orderBy('createdAt', 'asc'));
      const snap = await getDocs(q);
      const arr: Registration[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setRegs(arr);
    } catch (err) {
      console.error('load regs error', err);
      alert('Failed to load registrations: ' + String(err));
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const t = filterText.trim().toLowerCase();
    if (!t) return regs;
    return regs.filter(r =>
      (r.name ?? '').toString().toLowerCase().includes(t) ||
      (r.phone ?? '').toString().toLowerCase().includes(t) ||
      (r.aadhaar ?? '').toString().toLowerCase().includes(t)
    );
  }, [regs, filterText]);

  async function toggleApprove(regId: string, current?: boolean) {
    setBusyIds(s => ({ ...s, [regId]: true }));
    try {
      await updateDoc(doc(db, 'registrations', regId), { approved: !current });
      setRegs(s => s.map(r => r.id === regId ? { ...r, approved: !current } : r));
    } catch (err) {
      console.error('approve toggle error', err);
      alert('Failed to update: ' + String(err));
    } finally {
      setBusyIds(s => ({ ...s, [regId]: false }));
    }
  }

  async function removeRegistration(regId: string) {
    if (!confirm('Delete this registration?')) return;
    setBusyIds(s => ({ ...s, [regId]: true }));
    try {
      await deleteDoc(doc(db, 'registrations', regId));
      setRegs(s => s.filter(r => r.id !== regId));
    } catch (err) {
      console.error('delete reg error', err);
      alert('Failed to delete: ' + String(err));
    } finally {
      setBusyIds(s => ({ ...s, [regId]: false }));
    }
  }

  function exportCsv() {
    if (!regs || regs.length === 0) return alert('No registrations to export');
    const header = ['index','id','name','age','phone','aadhaar','approved','createdAt'];
    const lines = [header.join(',')];
    filtered.forEach((r, i) => {
      const created = r.createdAt ? (typeof r.createdAt === 'object' && r.createdAt.toDate ? r.createdAt.toDate().toISOString() : String(r.createdAt)) : '';
      const row = [
        String(i+1),
        r.id,
        `"${(r.name || '').replace(/"/g,'""')}"`,
        r.age ?? '',
        `"${(r.phone || '').replace(/"/g,'""')}"`,
        `"${(r.aadhaar || '').replace(/"/g,'""')}"`,
        r.approved ? 'true' : 'false',
        `"${created}"`
      ];
      lines.push(row.join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${sessionId}-registrations.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Registrations — session {sessionId}</h2>
          <div style={{ color: '#666' }}>{regs.length} registrations</div>
        </div>
        <div>
          <button onClick={() => router.back()} style={{ marginRight: 8 }}>Back</button>
          <button onClick={loadRegs} style={{ marginRight: 8 }}>Refresh</button>
          <button onClick={exportCsv}>Export CSV</button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input placeholder="Search name, phone or aadhaar" value={filterText} onChange={(e)=>setFilterText(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', width: 360 }} />
      </div>

      <div style={{ marginTop: 12 }}>
        {loading ? <div>Loading registrations...</div> : (
          filtered.length === 0 ? <div style={{ color: '#666' }}>No registrations found.</div> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <th style={{ padding: 8 }}>#</th>
                  <th style={{ padding: 8 }}>Name</th>
                  <th style={{ padding: 8 }}>Age</th>
                  <th style={{ padding: 8 }}>Phone</th>
                  <th style={{ padding: 8 }}>Aadhaar</th>
                  <th style={{ padding: 8 }}>Created</th>
                  <th style={{ padding: 8 }}>Status</th>
                  <th style={{ padding: 8 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #fafafa' }}>
                    <td style={{ padding: 8 }}>{i+1}</td>
                    <td style={{ padding: 8 }}>{r.name}</td>
                    <td style={{ padding: 8 }}>{r.age ?? '-'}</td>
                    <td style={{ padding: 8 }}>{r.phone ?? '-'}</td>
                    <td style={{ padding: 8 }}>{r.aadhaar ?? '-'}</td>
                    <td style={{ padding: 8 }}>{r.createdAt ? (typeof r.createdAt === 'object' && r.createdAt.toDate ? r.createdAt.toDate().toLocaleString() : String(r.createdAt)) : '-'}</td>
                    <td style={{ padding: 8 }}><span style={{ color: r.approved ? 'green' : '#999' }}>{r.approved ? 'Approved' : 'Pending'}</span></td>
                    <td style={{ padding: 8 }}>
                      <button onClick={() => toggleApprove(r.id, r.approved)} disabled={!!busyIds[r.id]} style={{ marginRight: 8 }}>{r.approved ? 'Unapprove' : 'Approve'}</button>
                      <button onClick={() => removeRegistration(r.id)} disabled={!!busyIds[r.id]} style={{ color: 'red' }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}
