// src/app/admin/import/page.tsx
'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  writeBatch,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';

type RowIn = {
  // expected input columns (strings)
  name?: string;
  age?: string;
  aadhaar?: string;
  phone?: string;
  preferredRole?: string;
  teamName?: string;
  // keep extras
  [k: string]: any;
};

type RowResult = {
  rowIndex: number;
  raw: RowIn;
  ok: boolean;
  error?: string;
  createdId?: string;
};

export default function AdminImportPage() {
  const [processing, setProcessing] = useState(false);
  const [progressText, setProgressText] = useState<string | null>(null);
  const [results, setResults] = useState<RowResult[]>([]);
  const [createdCount, setCreatedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [previewRows, setPreviewRows] = useState<RowIn[] | null>(null);

  // helper validators
  function cleanString(s: any) {
    if (s === null || s === undefined) return '';
    return String(s).trim();
  }
  function validAadhaar(a: string) {
    if (!a) return true; // optional
    return /^\d{12}$/.test(a);
  }
  function validAge(a: string) {
    if (!a) return false;
    const n = Number(a);
    return !isNaN(n) && n >= 12 && Number.isFinite(n);
  }

  // parse file
  function handleFile(file: File | null) {
    if (!file) return;
    setPreviewRows(null);
    setResults([]);
    setCreatedCount(0);
    setErrorCount(0);

    Papa.parse<RowIn>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = res.data.map(r => {
          // normalize keys to expected names (lowercase)
          const normalized: RowIn = {};
          Object.keys(r).forEach(k => {
            normalized[k.trim()] = (r as any)[k];
          });
          setPreviewRows(res.data as RowIn[]);
          // keep as is for now
        });
        setPreviewRows(res.data as RowIn[]);
      },
      error: (err) => {
        setProgressText('CSV parse error: ' + err.message);
      }
    });
  }

  // download template
  function downloadTemplate() {
    const headers = ['name', 'age', 'aadhaar', 'phone', 'preferredRole', 'teamName'];
    const row = ['Rahul Sharma', '23', '123456789012', '9876543210', 'Batsman', 'East Zone'];
    const csv = [headers.join(','), row.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'players-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // convert header keys to canonical names: map keys case-insensitively
  function canonicalizeRow(raw: RowIn): RowIn {
    const canonical: RowIn = {};
    Object.keys(raw).forEach(k => {
      const val = (raw as any)[k];
      const key = k.trim().toLowerCase();
      if (key === 'name') canonical.name = cleanString(val);
      else if (key === 'age') canonical.age = cleanString(val);
      else if (key === 'aadhaar') canonical.aadhaar = cleanString(val);
      else if (key === 'phone') canonical.phone = cleanString(val);
      else if (key === 'preferredrole' || key === 'preferred_role' || key === 'role') canonical.preferredRole = cleanString(val);
      else if (key === 'teamname' || key === 'team_name' || key === 'team') canonical.teamName = cleanString(val);
      else canonical[k] = val;
    });
    return canonical;
  }

  // core import function
  async function handleImport(file: File | null) {
    if (!file) return alert('Choose a CSV file first');
    setProcessing(true);
    setProgressText('Parsing CSV...');
    setResults([]);
    setCreatedCount(0);
    setErrorCount(0);

    // parse with Papa but in promise form
    const parsed = await new Promise<Papa.ParseResult<RowIn>>((resolve, reject) => {
      Papa.parse<RowIn>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => resolve(res),
        error: (err) => reject(err),
      });
    }).catch(err => {
      setProcessing(false);
      setProgressText('CSV parse error: ' + (err?.message || err));
      return null;
    });
    if (!parsed) return;

    const rawRows = parsed.data;
    if (!rawRows || rawRows.length === 0) {
      setProcessing(false);
      setProgressText('No rows found in CSV');
      return;
    }

    // build team cache (name -> id) from existing DB to avoid repeated queries
    setProgressText('Loading existing teams...');
    const teamsSnap = await getDocs(collection(db, 'teams'));
    const teamNameToId: Record<string, string> = {};
    teamsSnap.forEach(t => {
      const d = t.data() as any;
      const name = (d?.name || '').trim().toLowerCase();
      if (name) teamNameToId[name] = t.id;
    });

    const resultsArr: RowResult[] = [];
    let created = 0;
    let errors = 0;

    // We'll prepare batches (max 400 writes per batch to be safe)
    let currentBatch = writeBatch(db);
    let writesInBatch = 0;
    const BATCH_LIMIT = 400; // safe lower than 500

    async function commitBatchIfNeeded(force = false) {
      if ((writesInBatch > 0 && writesInBatch >= BATCH_LIMIT) || (force && writesInBatch > 0)) {
        setProgressText(`Committing ${writesInBatch} writes...`);
        try {
          await currentBatch.commit();
        } catch (err) {
          console.error('Batch commit error', err);
          // if commit fails we mark remaining rows as error
          // but we continue
        }
        // new batch
        currentBatch = writeBatch(db);
        writesInBatch = 0;
      }
    }

    setProgressText(`Validating ${rawRows.length} rows...`);

    for (let i = 0; i < rawRows.length; i++) {
      const raw = canonicalizeRow(rawRows[i] || {});
      const rowIndex = i + 2; // CSV row number (approx; +1 header)
      // validations
      if (!raw.name || !raw.name.trim()) {
        resultsArr.push({ rowIndex, raw, ok: false, error: 'Missing name' });
        errors++;
        continue;
      }
      if (!raw.age || !validAge(raw.age)) {
        resultsArr.push({ rowIndex, raw, ok: false, error: 'Invalid or missing age (must be numeric >= 12)' });
        errors++;
        continue;
      }
      if (raw.aadhaar && !validAadhaar(raw.aadhaar)) {
        resultsArr.push({ rowIndex, raw, ok: false, error: 'Invalid Aadhaar (should be 12 digits)'} );
        errors++;
        continue;
      }

      // ensure team: if teamName provided, find or create
      let teamId: string | null = null;
      if (raw.teamName) {
        const key = raw.teamName.trim().toLowerCase();
        if (teamNameToId[key]) {
          teamId = teamNameToId[key];
        } else {
          // create team doc now and cache it
          // will add to batch as a create: but writeBatch doesn't support addDoc directly.
          // So we'll create the team with addDoc immediately (safe since teams are fewer).
          try {
            const tRef = await addDoc(collection(db, 'teams'), {
              name: raw.teamName.trim(),
              createdAt: serverTimestamp()
            });
            teamNameToId[key] = tRef.id;
            teamId = tRef.id;
          } catch (err: any) {
            console.error('Create team failed', err);
            resultsArr.push({ rowIndex, raw, ok: false, error: 'Failed to create team: ' + (err?.message || err) });
            errors++;
            continue;
          }
        }
      }

      // prepare player doc
      const playerDoc = {
        name: raw.name.trim(),
        age: Number(raw.age),
        aadhaar: raw.aadhaar ? raw.aadhaar.trim() : null,
        phone: raw.phone ? cleanString(raw.phone) : null,
        preferredRole: raw.preferredRole ? cleanString(raw.preferredRole) : null,
        teamId: teamId,
        createdAt: serverTimestamp()
      };

      // we need a reference for the new doc to add to batch. Firestore's JS SDK requires set with doc(ref)
      const playersCol = collection(db, 'players');
      // create a new doc reference with auto id (client-side)
      // workaround: use addDoc (which commits immediately). To keep batching, we can use doc() with id generated by push-like helper.
      // Simpler: we'll add via addDoc directly for players to avoid complex batch doc refs. Keep code simpler and robust.
      try {
        const newRef = await addDoc(playersCol, playerDoc);
        resultsArr.push({ rowIndex, raw, ok: true, createdId: newRef.id });
        created++;
      } catch (err: any) {
        console.error('Add player failed', err);
        resultsArr.push({ rowIndex, raw, ok: false, error: 'Failed to create player: ' + (err?.message || err) });
        errors++;
      }
      // Note: batching write usage was considered but addDoc is more straightforward for mixed create-team+player flows
      // If you want ultra-fast bulk import later, we can change to use server-side functions or pre-generate doc refs for a true batch.
    } // end for rows

    // finalize
    setResults(resultsArr);
    setCreatedCount(created);
    setErrorCount(errors);
    setProcessing(false);
    setProgressText(`Finished: ${created} created, ${errors} errors`);

    // scroll down to results
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  // export errors CSV
  function downloadErrorsCsv() {
    if (!results || results.length === 0) return alert('No results to download');
    const errs = results.filter(r => !r.ok);
    if (errs.length === 0) return alert('No errors to download');
    const rows = errs.map(e => {
      const raw = e.raw || {};
      return {
        rowIndex: e.rowIndex,
        error: e.error || '',
        name: raw.name || '',
        age: raw.age || '',
        aadhaar: raw.aadhaar || '',
        phone: raw.phone || '',
        preferredRole: raw.preferredRole || '',
        teamName: raw.teamName || ''
      };
    });
    const header = Object.keys(rows[0]).join(',');
    const lines = rows.map(r => Object.values(r).map(v => {
      const s = (v ?? '').toString();
      return s.includes(',') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(','));
    const csv = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'players-import-errors.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: 12, maxWidth: 980, margin: '0 auto' }}>
      <h2>Admin — Bulk CSV Import (Players)</h2>

      <p>
        CSV must include header row. Supported columns (case-insensitive): <strong>name, age, aadhaar, phone, preferredRole, teamName</strong>.
      </p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <input
          id="csv-file-input"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => handleFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
        />
        <button onClick={() => {
          const f = (document.getElementById('csv-file-input') as HTMLInputElement | null)?.files?.[0];
          handleImport(f ?? null);
        }} disabled={processing}>Start Import</button>

        <button onClick={downloadTemplate} disabled={processing}>Download template</button>
        <button onClick={downloadErrorsCsv} disabled={processing || results.length === 0}>Download errors CSV</button>
      </div>

      <div style={{ marginBottom: 12 }}>
        {processing && <div style={{ color: '#0b5', marginBottom: 6 }}>Processing... {progressText}</div>}
        {!processing && progressText && <div style={{ color: '#333', marginBottom: 6 }}>{progressText}</div>}
      </div>

      <div style={{ border: '1px solid #eee', padding: 12, borderRadius: 6 }}>
        <h4>Preview (first 10 rows)</h4>
        {previewRows && previewRows.length > 0 ? (
          <div style={{ maxHeight: 220, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={{ padding: 6 }}>#</th><th style={{ padding: 6 }}>Raw CSV row</th></tr></thead>
              <tbody>
                {previewRows.slice(0,10).map((r, i) => (
                  <tr key={i}><td style={{ padding: 6 }}>{i+1}</td><td style={{ padding: 6 }}>{JSON.stringify(r)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div>No preview available yet (select CSV file)</div>}
      </div>

      <div style={{ marginTop: 18 }}>
        <h4>Import results</h4>
        <div style={{ marginBottom: 8 }}>Created: <strong>{createdCount}</strong> | Errors: <strong>{errorCount}</strong></div>

        {results.length > 0 && (
          <div style={{ maxHeight: 360, overflow: 'auto', border: '1px solid #f0f0f0', padding: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #ddd' }}>
                  <th style={{ padding: 6 }}>Row</th>
                  <th style={{ padding: 6 }}>Name</th>
                  <th style={{ padding: 6 }}>Age</th>
                  <th style={{ padding: 6 }}>Team</th>
                  <th style={{ padding: 6 }}>Status</th>
                  <th style={{ padding: 6 }}>Error</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.rowIndex} style={{ borderBottom: '1px solid #fafafa' }}>
                    <td style={{ padding: 6 }}>{r.rowIndex}</td>
                    <td style={{ padding: 6 }}>{r.raw?.name ?? ''}</td>
                    <td style={{ padding: 6 }}>{r.raw?.age ?? ''}</td>
                    <td style={{ padding: 6 }}>{r.raw?.teamName ?? ''}</td>
                    <td style={{ padding: 6 }}>{r.ok ? <span style={{ color: 'green' }}>Created</span> : <span style={{ color: 'orange' }}>Skipped</span>}</td>
                    <td style={{ padding: 6 }}>{r.error ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <small style={{ color: '#666' }}>
          Notes: This client-side importer uses `addDoc` for players and may be slower for very large files.
          If you need to import thousands of rows frequently, I can provide a server-side/cloud-function approach that is faster and atomic.
        </small>
      </div>
    </div>
  );
}

