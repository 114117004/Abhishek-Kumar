// src/app/admin/scan/page.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';

export default function AdminScanPage() {
  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const qrRegionRef = useRef<HTMLDivElement | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      // cleanup on unmount
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startScanner() {
    if (!qrRegionRef.current) {
      setMessage('No region to render scanner');
      return;
    }

    try {
      const elementId = qrRegionRef.current.id || (qrRegionRef.current.id = 'qr-region');
      const html5QrCode = new Html5Qrcode(elementId, /* verbose= */ false);
      scannerRef.current = html5QrCode;
      setScanning(true);
      setMessage('Starting camera... allow permissions if requested');

      const config = { fps: 10, qrbox: 250 };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        async (decodedText) => {
          // decodedText is the QR payload
          setLastScanned(decodedText);
          setMessage('Scanned: ' + decodedText);
          // try to handle it as a player id; if your QR contains JSON, adapt parsing
          await handleScannedValue(decodedText);
        },
        (errorMessage) => {
          // qr scan failure per frame â€” ignore or display if needed
          // console.log('QR frame error', errorMessage);
        }
      );
    } catch (err: any) {
      console.error('startScanner error', err);
      setMessage('Failed to start scanner: ' + (err?.message || err));
      setScanning(false);
    }
  }

  async function stopScanner() {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (err) {
      console.warn('stop scanner error', err);
    } finally {
      setScanning(false);
    }
  }

  async function handleScannedValue(value: string) {
    setMessage('Processing scanned value...');
    // if you encode plain playerId in QR, use it directly; else parse JSON
    // try to parse as JSON first
    let playerId = value;
    try {
      const parsed = JSON.parse(value);
      // assume parsed has { id: 'playerDocId' } or { playerId: '...' }
      if (parsed?.id) playerId = parsed.id;
      else if (parsed?.playerId) playerId = parsed.playerId;
      else if (parsed?.uid) playerId = parsed.uid;
    } catch {
      // not JSON, assume raw id
    }

    // update players/{playerId} checkedIn = true
    try {
      const ref = doc(db, 'players', playerId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        setMessage('Player not found for id: ' + playerId);
        return;
      }
      await updateDoc(ref, { checkedIn: true, checkedInAt: new Date().toISOString() });
      setMessage('Player checked in: ' + ((snap.data() as any).name ?? playerId));
    } catch (err: any) {
      console.error('handleScannedValue error', err);
      setMessage('Failed to mark checked in: ' + (err?.message || err));
    }
  }

  return (
    <div style={{ padding: 12, maxWidth: 900, margin: '0 auto' }}>
      <h2>Admin â€” Scan QR to Check-in</h2>

      <div style={{ marginTop: 12 }}>
        <div>
          <button onClick={() => (scanning ? stopScanner() : startScanner())}>
            {scanning ? 'Stop scanner' : 'Start scanner'}
          </button>
          <button onClick={() => { setLastScanned(null); setMessage(null); }} style={{ marginLeft: 8 }}>
            Clear
          </button>
        </div>

        <div
          ref={qrRegionRef}
          id="qr-region"
          style={{ marginTop: 12, width: '100%', minHeight: 300, border: '1px dashed #ddd', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {!scanning ? (
            <div style={{ textAlign: 'center', color: '#666' }}>
              <div>Scanner stopped</div>
              <div style={{ fontSize: 12 }}>Click â€œStart scannerâ€ and allow camera access</div>
            </div>
          ) : (
            <div style={{ color: '#666' }}>Scanningâ€¦ point camera at QR code</div>
          )}
        </div>

        <div style={{ marginTop: 12 }}>
          <strong>Last scanned:</strong> {lastScanned ?? '-'}
        </div>

        <div style={{ marginTop: 8, color: '#333' }}>
          <strong>Status:</strong> {message ?? '-'}
        </div>

        <div style={{ marginTop: 12, color: '#666', fontSize: 13 }}>
          <div>Expected QR payload: <code>playerDocId</code> or JSON like <code>{"{ \"id\": \"playerDocId\" }"}</code>.</div>
          <div>If your QR contains a different field, adapt <code>handleScannedValue</code> accordingly.</div>
        </div>
      </div>
    </div>
  );
}

