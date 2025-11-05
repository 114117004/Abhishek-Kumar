// src/app/leaderboard/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/firebase/firebaseConfig';

/**
 * Leaderboard behavior:
 * - Preferred: uses `teams` collection where each doc MAY have fields:
 *     { name, points, played, won, lost, drawn, nrr }
 *   If `points` exists on team docs, we use those and sort by points desc.
 *
 * - Fallback: if `teams` docs do not have `points`, try to compute from `matches` collection.
 *   Expected match doc shape (flexible):
 *     { teamAId, teamBId, scoreA?, scoreB?, winnerId?, isDraw?: boolean, played: true }
 *   Scoring rules (modifiable below): win=3, draw=1, loss=0.
 *
 * - Exports CSV
 */

type TeamRow = {
  id: string;
  name: string;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  points: number;
  nrr?: number | null;
};

export default function LeaderboardPage() {
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useComputed, setUseComputed] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'points' | 'won' | 'played' | 'nrr'>('points');
  const [sortDesc, setSortDesc] = useState(true);

  // scoring rules (can change as needed)
  const WIN_POINTS = 3;
  const DRAW_POINTS = 1;
  const LOSS_POINTS = 0;

  useEffect(() => {
    loadLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadLeaderboard() {
    setLoading(true);
    setError(null);
    setRows([]);
    setUseComputed(false);

    try {
      // 1) Try teams collection
      const teamsSnap = await getDocs(collection(db, 'teams'));
      const teams = teamsSnap.docs.map(d => ({ id: d.id, data: d.data() as any }));

      // check whether `points` exists on at least one team doc -> use direct teams if yes
      const hasPointsField = teams.some(t => t.data && typeof t.data.points === 'number');

      if (teams.length > 0 && hasPointsField) {
        // Use fields from team doc; default missing fields to 0
        const mapped: TeamRow[] = teams.map(t => ({
          id: t.id,
          name: (t.data.name as string) || (`Team ${t.id}`),
          played: Number(t.data.played ?? 0),
          won: Number(t.data.won ?? 0),
          lost: Number(t.data.lost ?? 0),
          drawn: Number(t.data.drawn ?? 0),
          points: Number(t.data.points ?? 0),
          nrr: t.data.nrr === undefined ? null : Number(t.data.nrr),
        }));
        setRows(mapped.sort((a, b) => b.points - a.points || (b.nrr ?? 0) - (a.nrr ?? 0)));
        setUseComputed(false);
        setLoading(false);
        return;
      }

      // 2) Fallback: compute from matches
      // Try to load matches collection
      const matchesSnap = await getDocs(collection(db, 'matches'));
      if (matchesSnap.empty) {
        // no teams with points and no matches -> show teams with defaults
        const fallback: TeamRow[] = teams.map(t => ({
          id: t.id,
          name: (t.data.name as string) || (`Team ${t.id}`),
          played: Number(t.data.played ?? 0),
          won: Number(t.data.won ?? 0),
          lost: Number(t.data.lost ?? 0),
          drawn: Number(t.data.drawn ?? 0),
          points: Number(t.data.points ?? 0),
          nrr: t.data.nrr === undefined ? null : Number(t.data.nrr),
        }));
        setRows(fallback.sort((a, b) => (b.points - a.points)));
        setLoading(false);
        return;
      }

      // build map of team stats
      const stats: Record<string, TeamRow> = {};

      // helper to ensure team entry exists in stats
      function ensureTeam(teamId: string, defaultName?: string) {
        if (!stats[teamId]) {
          stats[teamId] = {
            id: teamId,
            name: defaultName || teamId,
            played: 0,
            won: 0,
            lost: 0,
            drawn: 0,
            points: 0,
            nrr: null,
          };
        }
      }

      // iterate matches and update stats
      matchesSnap.forEach(mdoc => {
        const m = mdoc.data() as any;
        // expecting some fields; be flexible with names
        const teamA = m.teamAId || m.teamA || m.team1Id || m.team1;
        const teamB = m.teamBId || m.teamB || m.team2Id || m.team2;
        if (!teamA || !teamB) return; // skip malformed
        ensureTeam(teamA);
        ensureTeam(teamB);

        // consider only matches marked as played or having scores
        const played = m.played ?? (m.scoreA !== undefined && m.scoreB !== undefined) ?? true;

        if (!played) return;

        stats[teamA].played += 1;
        stats[teamB].played += 1;

        // determine winner/draw
        // priority: winnerId field, else compare numeric score fields, else look for isDraw
        if (m.winnerId) {
          const winner = String(m.winnerId);
          const loser = winner === teamA ? teamB : teamA;
          stats[winner].won += 1;
          stats[loser].lost += 1;
          stats[winner].points += WIN_POINTS;
        } else if (typeof m.scoreA === 'number' && typeof m.scoreB === 'number') {
          const scoreA = Number(m.scoreA);
          const scoreB = Number(m.scoreB);
          if (scoreA > scoreB) {
            stats[teamA].won += 1;
            stats[teamB].lost += 1;
            stats[teamA].points += WIN_POINTS;
          } else if (scoreB > scoreA) {
            stats[teamB].won += 1;
            stats[teamA].lost += 1;
            stats[teamB].points += WIN_POINTS;
          } else {
            stats[teamA].drawn += 1;
            stats[teamB].drawn += 1;
            stats[teamA].points += DRAW_POINTS;
            stats[teamB].points += DRAW_POINTS;
          }
        } else if (m.isDraw || m.draw === true) {
          stats[teamA].drawn += 1;
          stats[teamB].drawn += 1;
          stats[teamA].points += DRAW_POINTS;
          stats[teamB].points += DRAW_POINTS;
        } else {
          // if no clear result, skip awarding points
        }
      });

      // now fetch team names (from teams collection if available)
      const teamsMap: Record<string, string> = {};
      const teamsSnap2 = await getDocs(collection(db, 'teams'));
      teamsSnap2.forEach(t => {
        const d = t.data() as any;
        teamsMap[t.id] = d?.name ?? t.id;
      });
      // fill names from map if possible
      Object.keys(stats).forEach(id => {
        stats[id].name = teamsMap[id] ?? stats[id].name;
      });

      const computedRows = Object.values(stats).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        // tiebreaker: wins
        if (b.won !== a.won) return b.won - a.won;
        // fallback: played fewer losses better
        return (a.lost - b.lost);
      });

      setRows(computedRows);
      setUseComputed(true);
    } catch (err: any) {
      console.error('Leaderboard load error', err);
      setError(err?.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }

  // filtered + sorted view
  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    let arr = rows.slice();
    if (t) {
      arr = arr.filter(r => r.name.toLowerCase().includes(t));
    }
    // sort by sortKey
    arr.sort((a, b) => {
      let av: number | null = null;
      let bv: number | null = null;
      if (sortKey === 'points') { av = a.points; bv = b.points; }
      if (sortKey === 'won') { av = a.won; bv = b.won; }
      if (sortKey === 'played') { av = a.played; bv = b.played; }
      if (sortKey === 'nrr') { av = a.nrr ?? 0; bv = b.nrr ?? 0; }
      const diff = (bv ?? 0) - (av ?? 0);
      return sortDesc ? diff : -diff;
    });
    return arr;
  }, [rows, search, sortKey, sortDesc]);

  function exportCsv() {
    if (!rows || rows.length === 0) return alert('No rows to export');
    const hdr = ['rank','teamId','team','played','won','drawn','lost','points','nrr'];
    const lines = [hdr.join(',')];
    filtered.forEach((r, idx) => {
      const cells = [
        (idx+1).toString(),
        r.id,
        `"${(r.name || '').replace(/"/g,'""')}"`,
        r.played.toString(),
        r.won.toString(),
        r.drawn.toString(),
        r.lost.toString(),
        r.points.toString(),
        r.nrr == null ? '' : String(r.nrr),
      ];
      lines.push(cells.join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leaderboard.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: 12, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Leaderboard</h2>
        <div>
          <button onClick={loadLeaderboard} style={{ marginRight: 8 }}>Refresh</button>
          <button onClick={exportCsv}>Export CSV</button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
        <input placeholder="Search team..." value={search} onChange={(e)=>setSearch(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', width: 240 }} />
        <div>
          <label style={{ marginRight: 8 }}>
            Sort:
            <select value={sortKey} onChange={(e)=>setSortKey(e.target.value as any)} style={{ marginLeft: 8 }}>
              <option value="points">Points</option>
              <option value="won">Wins</option>
              <option value="played">Played</option>
              <option value="nrr">NRR</option>
            </select>
          </label>
          <button onClick={()=>setSortDesc(s=>!s)}>{sortDesc ? 'Desc' : 'Asc'}</button>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: '#666' }}>
          {useComputed ? 'Computed from matches' : 'Using teams collection fields'}
        </div>
      </div>

      {loading && <div style={{ marginTop: 12 }}>Loading leaderboard...</div>}
      {error && <div style={{ marginTop: 12, color: 'red' }}>{error}</div>}

      <div style={{ marginTop: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
              <th style={{ padding: 8 }}>#</th>
              <th style={{ padding: 8 }}>Team</th>
              <th style={{ padding: 8 }}>Played</th>
              <th style={{ padding: 8 }}>Won</th>
              <th style={{ padding: 8 }}>Drawn</th>
              <th style={{ padding: 8 }}>Lost</th>
              <th style={{ padding: 8 }}>Points</th>
              <th style={{ padding: 8 }}>NRR</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && !loading ? (
              <tr><td colSpan={8} style={{ padding: 12 }}>No teams found.</td></tr>
            ) : filtered.map((r, idx) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #fafafa' }}>
                <td style={{ padding: 8 }}>{idx + 1}</td>
                <td style={{ padding: 8 }}>{r.name}</td>
                <td style={{ padding: 8 }}>{r.played}</td>
                <td style={{ padding: 8 }}>{r.won}</td>
                <td style={{ padding: 8 }}>{r.drawn}</td>
                <td style={{ padding: 8 }}>{r.lost}</td>
                <td style={{ padding: 8 }}>{r.points}</td>
                <td style={{ padding: 8 }}>{r.nrr == null ? '-' : String(r.nrr)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
