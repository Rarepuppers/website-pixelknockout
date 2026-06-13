// ===== PKO automated result settlement (cross-checked) =====
// Runs server-side only (GitHub Actions). For each finished event it reads the
// playable main-card bouts that have no result yet, looks up the winner from TWO
// independent public sources, and ONLY auto-settles a bout when both sources
// agree on a clear A/B winner. Anything ambiguous (sources disagree, missing, or
// a draw/no-contest) is skipped and left for a human admin — this is the
// "confidence gate" the project requires before writing to the one-way points
// ledger.
//
// Sources:
//   1) Wikipedia event page results table (no key)
//   2) The Odds API /scores endpoint (uses ODDS_API_KEY)
//
// Settlement is written through the `auto_settle_bout` RPC, which is callable
// ONLY with the Supabase service_role key. Never expose that key to the browser.
//
// Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Optional env: ODDS_API_KEY, ODDS_SPORT, ODDS_REGION
// Without ODDS_API_KEY the cross-check can never reach agreement, so the job is a
// safe no-op (it will settle nothing).

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, "..");
const logFile = path.join(siteRoot, "content", "auto-settle-log.md");

const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ODDS_KEY = process.env.ODDS_API_KEY || "";
const ODDS_SPORT = process.env.ODDS_SPORT || "mma_mixed_martial_arts";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — aborting.");
  process.exit(1);
}

const log = [];
const note = msg => { console.log(msg); log.push(msg); };

// ---------- Supabase REST (service role) ----------
async function sbGet(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase GET ${query} -> ${res.status}: ${await res.text()}`);
  return res.json();
}
async function sbRpc(fn, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${text}`);
  try { return JSON.parse(text); } catch { return text; }
}

// ---------- name matching (mirrors the app/refresh helpers) ----------
function normName(name) {
  return String(name || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
function nameParts(name) {
  const parts = normName(name).split(" ").filter(Boolean);
  return { full: parts.join(" "), first: parts[0] || "", last: parts[parts.length - 1] || "" };
}
function namesMatch(a, b) {
  const x = nameParts(a), y = nameParts(b);
  if (!x.last || !y.last) return false;
  return x.full === y.full || (x.last === y.last && (!x.first || !y.first || x.first[0] === y.first[0]));
}

function stripTags(html) {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<sup[\s\S]*?<\/sup>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#160;/g, " ")
    .replace(/\s+/g, " ").trim();
}

// ---------- source 1: Wikipedia event results ----------
const wikiCache = new Map();
function candidatePages(event) {
  const out = new Set();
  if (event.short_title) out.add(event.short_title);
  // "Based on UFC 329: McGregor vs. Holloway 2" -> "UFC 329: McGregor vs. Holloway 2"
  if (event.real_title) out.add(event.real_title.replace(/^based on\s+/i, "").trim());
  return [...out].filter(Boolean);
}
async function wikiRowsFor(event) {
  const key = event.event_id;
  if (wikiCache.has(key)) return wikiCache.get(key);
  let rows = [];
  for (const page of candidatePages(event)) {
    try {
      const api = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=text&format=json&redirects=1&origin=*`;
      const res = await fetch(api, { headers: { "user-agent": "PixelKnockoutSettle/1.0" } });
      if (!res.ok) continue;
      const json = await res.json();
      const html = json?.parse?.text?.["*"];
      if (!html) continue;
      const tables = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map(m => m[0]);
      for (const t of tables) {
        for (const r of [...t.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map(m => m[0])) {
          const cells = [...r.matchAll(/<t[dh][\s\S]*?<\/t[dh]>/gi)].map(c => stripTags(c[0]));
          if (cells.length >= 4) rows.push(cells);
        }
      }
      if (rows.length) break;
    } catch { /* try next candidate */ }
  }
  wikiCache.set(key, rows);
  return rows;
}
// Returns { result:'a'|'b'|'draw'|'nc', method? } or null.
function wikiWinner(rows, aName, bName) {
  for (const cells of rows) {
    const ai = cells.findIndex(c => namesMatch(c, aName));
    const bi = cells.findIndex(c => namesMatch(c, bName));
    if (ai < 0 || bi < 0 || ai === bi) continue;
    const joined = cells.join(" ").toLowerCase();
    if (/no contest|\bnc\b/.test(joined)) return { result: "nc" };
    if (/\bdraw\b/.test(joined)) return { result: "draw" };
    const defIdx = cells.findIndex(c => /^def\.?$/i.test(c.trim()));
    let side = null;
    if (defIdx >= 0) {
      if (ai < defIdx && defIdx < bi) side = "a";
      else if (bi < defIdx && defIdx < ai) side = "b";
    }
    if (!side) side = ai < bi ? "a" : "b"; // UFC tables list the winner first
    const method = cells[Math.max(ai, bi) + 1] || "";
    return { result: side, method };
  }
  return null;
}

// ---------- source 2: The Odds API scores ----------
async function loadOddsScores() {
  if (!ODDS_KEY) { note("· Odds API key not set — cross-check cannot agree, nothing will auto-settle."); return null; }
  try {
    const url = `https://api.the-odds-api.com/v4/sports/${ODDS_SPORT}/scores/?daysFrom=3&apiKey=${encodeURIComponent(ODDS_KEY)}`;
    const res = await fetch(url);
    if (!res.ok) { note(`· Odds API scores returned ${res.status}.`); return null; }
    return res.json();
  } catch (e) { note(`· Odds API scores fetch failed: ${e.message}`); return null; }
}
// Returns { result:'a'|'b'|'draw' } or null.
function oddsWinner(games, aName, bName) {
  if (!Array.isArray(games)) return null;
  for (const g of games) {
    if (!g.completed || !Array.isArray(g.scores)) continue;
    const a = g.scores.find(s => namesMatch(s.name, aName));
    const b = g.scores.find(s => namesMatch(s.name, bName));
    if (!a || !b) continue;
    const av = Number(a.score), bv = Number(b.score);
    if (!Number.isFinite(av) || !Number.isFinite(bv)) return null;
    if (av === bv) return { result: "draw" };
    return { result: av > bv ? "a" : "b" };
  }
  return null;
}

// ---------- main ----------
const startedAt = new Date().toISOString();
note(`# PKO auto-settle run @ ${startedAt}`);

let settled = 0, skipped = 0, failed = 0;
try {
  const nowIso = new Date().toISOString();
  const events = await sbGet(
    `events?select=event_id,short_title,real_title,ends_at,status` +
    `&status=not.in.(archived,settled)&ends_at=lt.${encodeURIComponent(nowIso)}`
  );
  if (!events.length) note("· No finished events awaiting settlement.");

  const scores = events.length ? await loadOddsScores() : null;

  for (const event of events) {
    note(`\n## ${event.event_id} (${event.short_title || ""})`);
    const [bouts, results] = await Promise.all([
      sbGet(`event_bouts?select=bout_id,side_a,side_b,weight&event_id=eq.${event.event_id}&playable=eq.true&card_section=eq.main`),
      sbGet(`bout_results?select=bout_id&event_id=eq.${event.event_id}`),
    ]);
    const done = new Set(results.map(r => r.bout_id));
    const open = bouts.filter(b => !done.has(b.bout_id));
    if (!open.length) { note("· All main-card bouts already settled."); continue; }

    const rows = await wikiRowsFor(event);

    for (const bout of open) {
      const w = wikiWinner(rows, bout.side_a, bout.side_b);
      const o = oddsWinner(scores, bout.side_a, bout.side_b);
      const label = `${bout.bout_id} ${bout.side_a} vs ${bout.side_b}`;

      if (!w || !o) { note(`· SKIP ${label} — missing source (wiki=${w?.result || "—"}, odds=${o?.result || "—"}).`); skipped++; continue; }
      if (!["a", "b"].includes(w.result) || w.result !== o.result) {
        note(`· SKIP ${label} — no clear agreement (wiki=${w.result}, odds=${o.result}). Left for manual admin.`);
        skipped++; continue;
      }

      try {
        await sbRpc("auto_settle_bout", {
          p_event: event.event_id,
          p_bout: bout.bout_id,
          p_result: w.result,
          p_win_type: w.method || null,
          p_method_detail: "Auto-settled: Wikipedia + Odds API agree",
        });
        const who = w.result === "a" ? bout.side_a : bout.side_b;
        note(`· SETTLED ${label} -> ${who} wins${w.method ? ` (${w.method})` : ""}.`);
        settled++;
      } catch (e) {
        // already-settled races are fine; anything else is a real failure
        if (/already been settled/i.test(e.message)) { note(`· SKIP ${label} — already settled.`); skipped++; }
        else { note(`· FAIL ${label} — ${e.message}`); failed++; }
      }
    }
  }
} catch (e) {
  note(`\n!! Run error: ${e.message}`);
  failed++;
}

note(`\nSummary: settled=${settled} skipped=${skipped} failed=${failed}`);

await fs.mkdir(path.dirname(logFile), { recursive: true });
await fs.writeFile(logFile, log.join("\n") + "\n", "utf8");

// Non-zero exit on hard failures so the Action surfaces them; skips are normal.
process.exit(failed > 0 ? 1 : 0);
