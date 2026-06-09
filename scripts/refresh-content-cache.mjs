import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, "..");
const outFile = path.join(siteRoot, "js", "generated-content.js");
const logFile = path.join(siteRoot, "content", "content-refresh-log.md");

const wikiApi = "https://en.wikipedia.org/w/api.php?action=parse&page=List_of_UFC_events&prop=text&format=json&origin=*";
const oddsSport = process.env.ODDS_SPORT || "mma_mixed_martial_arts";
const oddsRegion = process.env.ODDS_REGION || "us";
const oddsMarket = process.env.ODDS_MARKET || "h2h";
const oddsKey = process.env.ODDS_API_KEY || "";

const currentEvent = {
  id: "ufc-329",
  playableBouts: [
    { id: "b1", a: "Conor McGregor", b: "Max Holloway" },
    { id: "b2", a: "Paddy Pimblett", b: "Benoit Saint Denis" },
    { id: "b3", a: "Cory Sandhagen", b: "Mario Bautista" },
  ],
};

function stripTags(html) {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<sup[\s\S]*?<\/sup>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(text) {
  const t = Date.parse(text);
  return Number.isFinite(t) ? new Date(t) : null;
}

function extractRows(tableHtml) {
  return [...String(tableHtml || "").matchAll(/<tr[\s\S]*?<\/tr>/gi)]
    .map(m => m[0])
    .slice(1)
    .map(row => [...row.matchAll(/<td[\s\S]*?<\/td>/gi)].map(cell => stripTags(cell[0])))
    .filter(cells => cells.length >= 4);
}

async function refreshUpcomingEvents(warnings) {
  try {
    const res = await fetch(wikiApi, { headers: { "user-agent": "PixelKnockoutContentRefresh/1.0" } });
    if (!res.ok) throw new Error(`Wikipedia returned ${res.status}`);
    const json = await res.json();
    const html = json?.parse?.text?.["*"];
    if (!html) throw new Error("Wikipedia response did not include parse text.");

    const scheduledIndex = html.indexOf('id="Scheduled_events"');
    const scoped = scheduledIndex >= 0 ? html.slice(scheduledIndex) : html;
    const table = scoped.match(/<table[\s\S]*?<\/table>/i)?.[0] || html.match(/<table[\s\S]*?<\/table>/i)?.[0];
    if (!table) throw new Error("No scheduled events table found.");

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return extractRows(table)
      .map(cells => {
        const parsed = parseDate(cells[1]);
        if (!parsed || parsed < startOfToday) return null;
        return {
          event: cells[0],
          date: cells[1],
          venue: cells[2],
          location: cells[3],
          parsed: parsed.toISOString(),
          sourceUrl: "https://en.wikipedia.org/wiki/List_of_UFC_events",
        };
      })
      .filter(Boolean)
      .sort((a, b) => Date.parse(a.parsed) - Date.parse(b.parsed))
      .slice(0, 2);
  } catch (error) {
    warnings.push(`Upcoming event refresh failed: ${error.message}`);
    return [];
  }
}

function normName(name) {
  return String(name || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
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

function median(nums) {
  const vals = nums.filter(Number.isFinite).sort((a, b) => a - b);
  if (!vals.length) return null;
  const mid = Math.floor(vals.length / 2);
  return vals.length % 2 ? vals[mid] : Math.round((vals[mid - 1] + vals[mid]) / 2);
}

function bookmakerOutcomes(game) {
  const rows = [];
  for (const book of game.bookmakers || []) {
    const market = (book.markets || []).find(m => m.key === oddsMarket);
    for (const outcome of market?.outcomes || []) {
      if (Number.isFinite(outcome.price)) rows.push({ bookmaker: book.key, name: outcome.name, price: outcome.price });
    }
  }
  return rows;
}

async function refreshOddsSnapshot(warnings) {
  if (!oddsKey) {
    warnings.push("ODDS_API_KEY is not configured; leaving odds snapshot empty.");
    return null;
  }

  try {
    const url = new URL(`https://api.the-odds-api.com/v4/sports/${oddsSport}/odds/`);
    url.searchParams.set("regions", oddsRegion);
    url.searchParams.set("markets", oddsMarket);
    url.searchParams.set("oddsFormat", "american");
    url.searchParams.set("apiKey", oddsKey);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Odds API returned ${res.status}`);
    const games = await res.json();
    const books = new Set();
    const snapshot = { eventId: currentEvent.id, fetchedAt: Date.now(), bouts: {}, matchedBouts: 0, bookmakers: 0 };

    for (const bout of currentEvent.playableBouts) {
      let best = null;
      for (const game of games || []) {
        const outcomes = bookmakerOutcomes(game);
        const aPrices = outcomes.filter(o => namesMatch(o.name, bout.a)).map(o => o.price);
        const bPrices = outcomes.filter(o => namesMatch(o.name, bout.b)).map(o => o.price);
        if (aPrices.length && bPrices.length) {
          const score = aPrices.length + bPrices.length;
          if (!best || score > best.score) best = { game, aPrices, bPrices, score };
        }
      }
      if (!best) continue;
      const oddsA = median(best.aPrices);
      const oddsB = median(best.bPrices);
      if (oddsA == null || oddsB == null) continue;
      for (const book of best.game.bookmakers || []) books.add(book.key);
      snapshot.bouts[bout.id] = {
        oddsA,
        oddsB,
        sourceTitle: best.game.home_team && best.game.away_team ? `${best.game.home_team} vs ${best.game.away_team}` : best.game.id,
      };
      snapshot.matchedBouts += 1;
    }

    snapshot.bookmakers = books.size;
    if (!snapshot.matchedBouts) warnings.push("Odds API responded, but no playable UFC 329 bouts matched.");
    return snapshot.matchedBouts ? snapshot : null;
  } catch (error) {
    warnings.push(`Odds refresh failed: ${error.message}`);
    return null;
  }
}

const warnings = [];
const updatedAt = new Date().toISOString();
const generated = {
  updatedAt,
  rankingsUpdated: "June 2, 2026",
  upcomingEvents: await refreshUpcomingEvents(warnings),
  oddsSnapshot: await refreshOddsSnapshot(warnings),
  warnings,
  sources: {
    upcomingEvents: "https://en.wikipedia.org/wiki/List_of_UFC_events",
    odds: "https://the-odds-api.com/",
  },
};

await fs.mkdir(path.dirname(logFile), { recursive: true });
await fs.writeFile(outFile, `window.PKO_GENERATED_CONTENT = ${JSON.stringify(generated, null, 2)};\n`, "utf8");
await fs.writeFile(logFile, [
  "# Pixel Knockout Content Refresh",
  "",
  `Last generated: ${updatedAt}`,
  `Upcoming events cached: ${generated.upcomingEvents.length}`,
  `Odds snapshot matched bouts: ${generated.oddsSnapshot?.matchedBouts || 0}`,
  "",
  "Warnings:",
  ...(warnings.length ? warnings.map(w => `- ${w}`) : ["- None"]),
  "",
].join("\n"), "utf8");
