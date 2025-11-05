// src/app/admin/qr/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

type Player = {
  id: string;
  name?: string;
  teamId?: string;
  teamName?: string;
  phone?: string | null;
  aadhaar?: string | null;
};

export default function AdminQRPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPlayers() {
    setLoading(true);
    setError(null);
    setQrMap({});
    try {
      // load teams map
      const teamsSnap = await getDocs(collection(db, 'teams'));
      const teamsMap: Record<string, string> = {};
      teamsSnap.forEach(t => {
        const d = t.data() as any;
        teamsMap[t.id] = d?.name || 'Unnamed';
      });

      // load players
      const playersSnap = await getDocs(collection(db, 'players'));
      const arr: Player[] = playersSnap.docs.map(d => {
        const data = d.data() as any;
        return {
          id: d.id,
          name: data.name,
          teamId: data.teamId,
          teamName: data.teamId ? teamsMap[data.teamId] : undefined,
          phone: data.phone,
          aadhaar: data.aadhaar,
        };
      });

      setPlayers(arr);

      // generate QR data URLs in parallel
      const map: Record<string, string> = {};
      await Promise.all(
        arr.map(async (p) => {
          // payload: raw player id (scanner can parse JSON too if you change this)
          const payload = p.id;
          try {
            const url = await QRCode.toDataURL(payload, { margin: 1, width: 300 });
            map[p.id] = url;
          } catch (err) {
            console.error('QR gen error for', p.id, err);
          }
        })
      );
      setQrMap(map);
    } catch (err: any) {
      console.error('load players for QR error', err);
      setError(err?.message || 'Failed to load players');
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  async function downloadAllQRsAsZip() {
    if (!players || players.length === 0) return alert('No players to download');

    // ensure qrMap is populated
    const missing = players.filter(p => !qrMap[p.id]);
    if (missing.length > 0) {
      const proceed = confirm(
        `QR images not fully generated for ${missing.length} players. Click OK to attempt ZIP with available images, or Cancel to regenerate first.`
      );
      if (!proceed) return;
    }

    const zip = new JSZip();
    const folder = zip.folder('qr-badges')!;

    for (const p of players) {
      const dataUrl = (qrMap && qrMap[p.id]) ?? null;
      if (!dataUrl) {
        console.warn('No QR for', p.id);
        continue;
      }

      // Convert data URL (base64) to binary
      const base64 = dataUrl.split(',')[1];
      if (!base64) continue;
      try {
        const binary = atob(base64);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);

        // sanitize filename
        const namePart = (p.name || 'player').replace(/[^a-z0-9\-_]/gi, '_').slice(0, 40);
        const filename = `${namePart}_${p.id}.png`;
        folder.file(filename, array, { binary: true });
      } catch (err) {
        console.error('Failed convert QR for', p.id, err);
      }
    }

    try {
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `qr-badges-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.zip`);
    } catch (err: any) {
      console.error('zip generate error', err);
      alert('Failed to create ZIP: ' + (err?.message || err));
    }
  }

  return (
    <div style={{ padding: 12, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>QR Badges</h2>
        <div>
          <button onClick={handlePrint} style={{ marginRight: 8 }}>Print badges</button>
          <button onClick={downloadAllQRsAsZip} style={{ marginRight: 8 }}>Download all QR PNGs (ZIP)</button>
          <button onClick={loadPlayers}>Refresh</button>
        </div>
      </div>

      {loading && <div>Loading players & generating QR codes...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}

      <div style={{ marginTop: 12 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 12
        }}>
          {players.map(p => (
            <div key={p.id} className="badge" style={{
              background: '#fff',
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: 12,
              textAlign: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}>
              <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {qrMap[p.id] ? (
                  <img src={qrMap[p.id]} alt={p.name} style={{ maxWidth: '100%', maxHeight: 150 }} />
                ) : (
                  <div style={{ color: '#999' }}>Generating...</div>
                )}
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 700 }}>{p.name ?? 'Unnamed'}</div>
                <div style={{ fontSize: 13, color: '#666' }}>{p.teamName ?? p.teamId ?? '-'}</div>
                <div style={{ fontSize: 12, color: '#444', marginTop: 6 }}>{p.phone ?? ''}</div>

                <div style={{ marginTop: 6, fontSize: 11, color: '#666' }}>
                  <small>Payload: <code style={{ fontSize: 10 }}>{p.id}</code></small>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        /* print-friendly: make badges fill pages with minimal chrome */
        @media print {
          body * { visibility: hidden; }
          .badge, .badge * { visibility: visible; }
          .badge { page-break-inside: avoid; }
          /* print multiple badges per page */
          .badge { width: 200px; display: inline-block; margin: 6px; }
        }
      `}</style>
    </div>
  );
}
