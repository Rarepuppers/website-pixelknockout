// ===== PKO store: auth + game state =====
// Backends behind one interface:
//   • LOCAL  (default)  — localStorage, offline, for dev/demo.
//   • SUPABASE          — when config.SUPABASE_URL + ANON_KEY are set.
//
// Economy = ONE season-scoped Glory Points balance per player. Points are only
// ever GRANTED (signup / daily / per-event) or won/lost on predictions. They can
// never be bought, transferred, or cashed out. The leaderboard ranks total
// points; it resets each calendar-year season.

(function () {
  const CFG = window.PKO_CONFIG;
  const SEASON = CFG.CURRENT_SEASON;
  const KEY = "pko_state_v2";
  const ODDS_CACHE_KEY = "pko_difficulty_cache_v1";
  const useSupabase = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
  const today = () => new Date().toISOString().slice(0, 10);

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
  function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }

  function fresh() {
    return { season: SEASON, points: {}, grants: { signup: false, daily: null, events: {}, bonuses: {} },
      predictions: {}, trophies: [], history: [], bots: null };
  }
  function ensure(s) {
    if (!s.grants) Object.assign(s, fresh());
    // annual reset: new season -> points reset, trophies kept as history.
    if (s.season !== SEASON) { s.season = SEASON; s.grants = { signup: s.grants.signup, daily: null, events: {}, bonuses: {} }; }
    s.grants.bonuses = s.grants.bonuses || {};
    s.points = s.points || {}; s.predictions = s.predictions || {}; s.trophies = s.trophies || [];
    s.history = s.history || [];
    return s;
  }

  // ---------- profanity / name validation ----------
  // Small but real blocklist; normalized to catch leetspeak. Extend server-side.
  const BLOCK = ["nigger","nigga","faggot","fag","retard","rape","rapist","nazi","hitler",
    "kike","spic","chink","cunt","whore","slut","pedo","pedophile","molest","kkk","beaner",
    "tranny","dyke","coon","wetback","jihad","isis","terrorist","cock","dick","pussy","fuck",
    "shit","bitch","bastard","wank","twat","anus","penis","vagina","semen","cum","porn"];
  function normalizeName(s) {
    return String(s).toLowerCase()
      .replace(/[1!|]/g, "i").replace(/0/g, "o").replace(/3/g, "e").replace(/4|@/g, "a")
      .replace(/5|\$/g, "s").replace(/7/g, "t").replace(/[^a-z0-9]/g, "");
  }
  function validateName(name) {
    const raw = String(name || "").trim();
    if (raw.length < 3) return { ok: false, reason: "Name must be at least 3 characters." };
    if (raw.length > 18) return { ok: false, reason: "Name must be 18 characters or fewer." };
    if (!/^[A-Za-z0-9 _\-]+$/.test(raw)) return { ok: false, reason: "Letters, numbers, spaces, - and _ only." };
    const norm = normalizeName(raw);
    if (BLOCK.some(w => norm.includes(w))) return { ok: false, reason: "That name isn't allowed. Try another." };
    return { ok: true, name: raw };
  }

  function seedBots(s) {
    if (s.bots) return;
    const names = ["KOKing","GlovesOff","PixelPanther","TapMachine","OctaGoon","RoundOne",
      "SubZero","JabbaTheCut","GuillotineGuy","FightNerd","CageRattler","SprawlBrawl",
      "LegKickLarry","DivisionDan","ChinCheck"];
    const icons = ["🥇","🥈","🥉","🥉","🥊","🏆","🥊","🥈","🥊","🏆","🥉","🥊","🥊","🥈","🥊"];
    s.bots = names.map((n, i) => ({ id: "bot_" + i, name: n,
      points: Math.floor(400 + Math.random() * 5200), showcaseIcon: icons[i], showcaseTitle: "Shrine item" }));
  }

  // ---------- Supabase (lazy) ----------
  let sb = null;
  async function getSb() {
    if (sb) return sb;
    if (!window.supabase) {
      await new Promise((res, rej) => {
        const t = document.createElement("script");
        t.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
        t.onload = res; t.onerror = rej; document.head.appendChild(t);
      });
    }
    sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
    return sb;
  }

  const store = {
    mode: useSupabase ? "supabase" : "local",
    user: null,          // {id,email,name,nameChosen}
    EVENT: window.PKO_EVENT,

    async init() {
      if (useSupabase) {
        const c = await getSb();
        const { data } = await c.auth.getUser();
        if (data && data.user) this.user = await this._mapUser(c, data.user);
        c.auth.onAuthStateChange(async (_e, sess) => {
          this.user = sess ? await this._mapUser(await getSb(), sess.user) : null;
          window.dispatchEvent(new Event("pko-auth"));
        });
      } else {
        const s = ensure(load()); save(s);
        this.user = s.user || null;
      }
      await this.fetchOdds();           // refresh card difficulty (no-op without key)
      if (this.user && this.user.nameChosen) await this._runGrants();
      return this.user;
    },

    async _mapUser(c, u) {
      let name = (u.user_metadata && u.user_metadata.name) || null, chosen = false;
      let createdAt = u.created_at || new Date().toISOString(), showcaseItemId = null, showcaseIcon = null, showcaseTitle = null;
      try {
        const { data } = await c.from("profiles").select("name,name_chosen,created_at,showcase_item_id,showcase_icon,showcase_title").eq("id", u.id).single();
        if (data) {
          name = data.name; chosen = !!data.name_chosen; createdAt = data.created_at || createdAt;
          showcaseItemId = data.showcase_item_id; showcaseIcon = data.showcase_icon; showcaseTitle = data.showcase_title;
        }
      } catch {}
      return { id: u.id, email: u.email, name: name || (u.email || "Fighter").split("@")[0], nameChosen: chosen,
        createdAt, showcaseItemId, showcaseIcon, showcaseTitle };
    },

    // ---------- card difficulty: lock at pick-time ----------
    async fetchOdds() {
      const cacheMinutes = CFG.ODDS_CACHE_MINUTES || 15;
      const cacheValid = (cached) => cached && cached.eventId === this.EVENT.id &&
        Date.now() - cached.fetchedAt < cacheMinutes * 60 * 1000;
      const applyCached = () => {
        try {
          const cached = JSON.parse(localStorage.getItem(ODDS_CACHE_KEY));
          if (!cacheValid(cached)) return false;
          this._applyOddsSnapshot(cached);
          this.EVENT.oddsSource = "cached";
          this.EVENT.oddsUpdatedAt = cached.fetchedAt;
          this.EVENT.oddsMatchedBouts = cached.matchedBouts || 0;
          return true;
        } catch { return false; }
      };

      if (!CFG.ODDS_ENABLED || !CFG.ODDS_API_KEY) {
        this.EVENT.oddsSource = "placeholder";
        this.EVENT.oddsStatus = CFG.ODDS_ENABLED ? "Add an external data key to enable card difficulty updates." : "Card difficulty updates disabled.";
        return;
      }
      if (applyCached()) return;

      try {
        const url = `https://api.the-odds-api.com/v4/sports/${CFG.ODDS_SPORT}/odds/` +
          `?regions=${encodeURIComponent(CFG.ODDS_REGION)}&markets=${encodeURIComponent(CFG.ODDS_MARKET || "h2h")}` +
          `&oddsFormat=american&apiKey=${encodeURIComponent(CFG.ODDS_API_KEY)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Odds API returned ${res.status}`);
        const games = await res.json();
        const snapshot = this._buildOddsSnapshot(games);
        if (!snapshot.matchedBouts) throw new Error("No matching MMA odds found for this card.");
        localStorage.setItem(ODDS_CACHE_KEY, JSON.stringify(snapshot));
        this._applyOddsSnapshot(snapshot);
        this.EVENT.oddsSource = "live";
        this.EVENT.oddsUpdatedAt = snapshot.fetchedAt;
        this.EVENT.oddsMatchedBouts = snapshot.matchedBouts;
        this.EVENT.oddsStatus = `Matched ${snapshot.matchedBouts}/${this.EVENT.bouts.length} bouts from ${snapshot.bookmakers} bookmakers.`;
      } catch (e) {
        if (applyCached()) return;
        this.EVENT.oddsSource = "placeholder";
        this.EVENT.oddsStatus = e.message || "Card difficulty updates unavailable.";
      }
    },

    _normName(name) {
      return String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    },
    _nameParts(name) {
      const n = this._normName(name);
      const parts = n.split(" ").filter(Boolean);
      return { full: n, first: parts[0] || "", last: parts[parts.length - 1] || "" };
    },
    _namesMatch(a, b) {
      const x = this._nameParts(a), y = this._nameParts(b);
      if (!x.last || !y.last) return false;
      return x.full === y.full || (x.last === y.last && (!x.first || !y.first || x.first[0] === y.first[0]));
    },
    _median(nums) {
      const vals = nums.filter(n => Number.isFinite(n)).sort((a, b) => a - b);
      if (!vals.length) return null;
      const mid = Math.floor(vals.length / 2);
      return vals.length % 2 ? vals[mid] : Math.round((vals[mid - 1] + vals[mid]) / 2);
    },
    _bookmakerOutcomes(game) {
      const rows = [];
      (game.bookmakers || []).forEach(book => {
        const market = (book.markets || []).find(m => m.key === (CFG.ODDS_MARKET || "h2h"));
        (market?.outcomes || []).forEach(outcome => {
          if (Number.isFinite(outcome.price)) rows.push({ bookmaker: book.key, name: outcome.name, price: outcome.price });
        });
      });
      return rows;
    },
    _findBoutGame(games, bout) {
      let best = null;
      games.forEach(game => {
        const outcomes = this._bookmakerOutcomes(game);
        const aPrices = outcomes.filter(o => this._namesMatch(o.name, bout.a.real)).map(o => o.price);
        const bPrices = outcomes.filter(o => this._namesMatch(o.name, bout.b.real)).map(o => o.price);
        if (aPrices.length && bPrices.length) {
          const score = aPrices.length + bPrices.length;
          if (!best || score > best.score) best = { game, aPrices, bPrices, score };
        }
      });
      return best;
    },
    _buildOddsSnapshot(games) {
      const snapshot = { eventId: this.EVENT.id, fetchedAt: Date.now(), bouts: {}, matchedBouts: 0, bookmakers: 0 };
      const books = new Set();
      this.EVENT.bouts.forEach(bout => {
        const match = this._findBoutGame(games, bout);
        if (!match) return;
        (match.game.bookmakers || []).forEach(b => books.add(b.key));
        const oddsA = this._median(match.aPrices);
        const oddsB = this._median(match.bPrices);
        if (oddsA == null || oddsB == null) return;
        snapshot.bouts[bout.id] = {
          oddsA, oddsB,
          sourceTitle: match.game.home_team && match.game.away_team ? `${match.game.home_team} vs ${match.game.away_team}` : match.game.id,
        };
        snapshot.matchedBouts += 1;
      });
      snapshot.bookmakers = books.size;
      return snapshot;
    },
    _applyOddsSnapshot(snapshot) {
      this.EVENT.bouts.forEach(bout => {
        const hit = snapshot.bouts && snapshot.bouts[bout.id];
        if (!hit) return;
        bout.oddsA = hit.oddsA;
        bout.oddsB = hit.oddsB;
        bout.oddsSourceTitle = hit.sourceTitle;
      });
    },

    // ---------- auth ----------
    async signInGoogle() {
      if (useSupabase) {
        const c = await getSb();
        return c.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.href } });
      }
      return this._localSignIn("pixelfan@gmail.com");
    },
    async signInEmail(email) {
      if (!email || !email.includes("@")) throw new Error("Enter a valid email.");
      if (useSupabase) {
        const c = await getSb();
        return c.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } });
      }
      return this._localSignIn(email);
    },
    _localSignIn(email) {
      const s = ensure(load());
      const id = "local_" + btoa(email).slice(0, 12);
      const prev = s.user && s.user.id === id ? s.user : {};
      s.user = { id: "local_" + btoa(email).slice(0, 12), email,
        name: prev.name || (email.split("@")[0] || "Fighter"), nameChosen: !!prev.nameChosen,
        createdAt: prev.createdAt || new Date().toISOString(),
        showcaseItemId: prev.showcaseItemId || null, showcaseIcon: prev.showcaseIcon || null, showcaseTitle: prev.showcaseTitle || null };
      save(s); this.user = s.user;
      window.dispatchEvent(new Event("pko-auth"));
      return { ok: true, instant: true };
    },
    async signOut() {
      if (useSupabase) { const c = await getSb(); await c.auth.signOut(); }
      else { const s = load(); delete s.user; save(s); }
      this.user = null; window.dispatchEvent(new Event("pko-auth"));
    },

    needsUsername() { return this.user && !this.user.nameChosen; },

    async setUsername(name) {
      const v = validateName(name);
      if (!v.ok) throw new Error(v.reason);
      if (useSupabase) {
        const c = await getSb();
        const { error } = await c.from("profiles").update({ name: v.name, name_chosen: true }).eq("id", this.user.id);
        if (error) throw new Error(error.message);
      } else {
        const s = ensure(load());
        s.user.name = v.name; s.user.nameChosen = true; save(s);
      }
      this.user.name = v.name; this.user.nameChosen = true;
      await this._runGrants();
      window.dispatchEvent(new Event("pko-auth"));
    },

    // ---------- grants (signup + daily + per-event) ----------
    async _runGrants() {
      await this.ensureSignupGrant();
      await this.ensureDailyGrant();
      await this.ensureEventGrant(this.EVENT.id);
    },
    _addPoints(s, n, meta = {}) {
      s.points[SEASON] = (s.points[SEASON] || 0) + n;
      s.history = s.history || [];
      s.history.unshift(Object.assign({
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        season: SEASON,
        amount: n,
        balance: s.points[SEASON],
        createdAt: new Date().toISOString(),
      }, meta));
    },

    async ensureSignupGrant() {
      if (useSupabase) { const c = await getSb(); await c.rpc("grant_signup", { p_amount: CFG.POINTS_SIGNUP }); return; }
      const s = ensure(load());
      if (!s.grants.signup) {
        this._addPoints(s, CFG.POINTS_SIGNUP, { type: "grant", label: "Signup welcome grant" });
        s.grants.signup = true; save(s);
      }
    },
    async ensureDailyGrant() {
      if (useSupabase) { const c = await getSb(); await c.rpc("grant_daily", { p_amount: CFG.POINTS_DAILY, p_day: today() }); return; }
      const s = ensure(load());
      if (s.grants.daily !== today()) {
        const first = s.grants.daily === null && s.grants.signup; // skip double on the signup day
        if (!first) this._addPoints(s, CFG.POINTS_DAILY, { type: "grant", label: "Daily visit grant" });
        s.grants.daily = today(); save(s);
      }
    },
    async ensureEventGrant(eventId) {
      if (useSupabase) { const c = await getSb(); await c.rpc("grant_event_points", { p_event: eventId, p_amount: CFG.POINTS_PER_EVENT }); return; }
      const s = ensure(load());
      if (!s.grants.events[eventId]) {
        this._addPoints(s, CFG.POINTS_PER_EVENT, { type: "event_grant", eventId, label: `${eventId.toUpperCase()} event grant` });
        s.grants.events[eventId] = true; save(s);
      }
    },

    // ---------- points / predictions ----------
    async getPoints() {
      if (useSupabase) { const c = await getSb();
        const { data } = await c.from("season_scores").select("points").eq("season", SEASON).single();
        return (data && data.points) || 0; }
      const s = ensure(load()); return s.points[SEASON] || 0;
    },
    async getPointHistory(limit = 50) {
      if (useSupabase) { const c = await getSb();
        const { data } = await c.from("point_history").select("*").eq("season", SEASON)
          .order("created_at", { ascending: false }).limit(limit);
        return (data || []).map(r => ({
          id: r.id, season: r.season, type: r.kind, eventId: r.event_id,
          label: r.label, amount: r.amount, balance: r.balance, createdAt: r.created_at,
        })); }
      const s = ensure(load()); return (s.history || []).filter(h => h.season === SEASON).slice(0, limit);
    },
    async getBonusClaims() {
      if (useSupabase) { const c = await getSb();
        const { data } = await c.from("event_bonus_claims").select("bonus_id");
        const m = {}; (data || []).forEach(r => m[r.bonus_id] = true); return m; }
      const s = ensure(load()); return s.grants.bonuses || {};
    },
    async claimEventBonus(bonus) {
      if (useSupabase) { const c = await getSb();
        const { error } = await c.rpc("claim_event_bonus", { p_bonus_id: bonus.id });
        if (error) throw new Error(error.message);
        return; }
      const s = ensure(load());
      const now = Date.now();
      if (now < new Date(bonus.startTime).getTime() || now > new Date(bonus.endTime).getTime())
        throw new Error("That bonus is not available right now.");
      if (s.grants.bonuses[bonus.id]) throw new Error("Bonus already claimed.");
      s.grants.bonuses[bonus.id] = true;
      this._addPoints(s, bonus.amount, { type: "event_bonus", eventId: this.EVENT.id, bonusId: bonus.id, label: bonus.label });
      save(s);
    },
    async getPredictions(eventId) {
      if (useSupabase) { const c = await getSb();
        const { data } = await c.from("predictions").select("*").eq("event_id", eventId);
        const m = {}; (data || []).forEach(p => m[p.bout_id] = Object.assign({}, p, {
          boutId: p.bout_id,
          multiplier: Number(p.multiplier),
        })); return m; }
      const s = ensure(load()); return s.predictions[eventId] || {};
    },
    // picks: [{boutId, pick, stake, multiplier}]
    async submitPicks(eventId, picks) {
      const total = picks.reduce((n, p) => n + p.stake, 0);
      if (total > await this.getPoints()) throw new Error("Not enough Glory Points.");
      if (useSupabase) { const c = await getSb(); await c.rpc("submit_predictions", { p_event: eventId, p_picks: picks }); return; }
      const s = ensure(load());
      s.predictions[eventId] = s.predictions[eventId] || {};
      picks.forEach(p => s.predictions[eventId][p.boutId] =
        { pick: p.pick, stake: p.stake, multiplier: p.multiplier, settled: false, won: 0, result: null });
      this._addPoints(s, -total, { type: "prediction_stake", eventId, label: `Locked predictions for ${eventId.toUpperCase()}` });
      save(s);
    },

    // ---------- per-fight settlement (demo) ----------
    // Resolves ONE bout, updates points immediately so the leaderboard moves
    // after each fight. Production: a server cron reads real results instead.
    async settleNextBout(eventId, opts = {}) {
      const s = ensure(load());
      const preds = s.predictions[eventId] || {};
      const bout = this.EVENT.bouts.find(b => preds[b.id] && !preds[b.id].settled);
      if (!bout) return { done: true };
      const p = preds[bout.id];
      // A bout is voided if forced (demo), or flagged on the card (e.g. a real
      // fight scratched at weigh-ins / pulled). Voided => stake refunded, the
      // pick is neither a hit nor a miss, and it's excluded from the record.
      const voided = opts.void || bout.voided || bout.demoWinner === "void";
      if (voided) {
        this._addPoints(s, p.stake, { type: "prediction_refund", eventId, label: `${bout.weight} bout void refund` });
        p.voided = true; p.settled = true; p.result = "void"; p.won = 0;
        bout.result = "void";
      } else {
        const winner = bout.demoWinner;
        if (p.pick === winner) {
          p.won = Math.round(p.stake * p.multiplier);
          this._addPoints(s, p.won, { type: "prediction_win", eventId, label: `${bout[p.pick].name} prediction win` });
        } else {
          s.history.unshift({
            id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
            season: SEASON,
            type: "prediction_loss",
            eventId,
            label: `${bout[p.pick].name} prediction missed`,
            amount: 0,
            balance: s.points[SEASON] || 0,
            createdAt: new Date().toISOString(),
          });
        }
        p.settled = true; p.result = winner; bout.result = winner;
      }
      save(s);
      const remaining = this.EVENT.bouts.some(b => preds[b.id] && !preds[b.id].settled);
      let awarded = null;
      if (!remaining) awarded = await this._awardTrophies(eventId);
      return { done: false, bout, voided, won: p.won, hit: !voided && p.pick === bout.demoWinner,
        stake: p.stake, finished: !remaining, awarded };
    },

    // ---------- trophies / belts (virtual, zero value) ----------
    BELTS: { 1:{icon:"🏆",title:"Undisputed Champ"},2:{icon:"🥈",title:"Interim Champ"},
      3:{icon:"🥉",title:"#1 Contender"},4:{icon:"🎖️",title:"Top Contender"},5:{icon:"🎖️",title:"Ranked Contender"} },
    EVENT_BADGES: {
      1: { icon: "🥇", title: "Gold Event Badge", material: "Gold" },
      2: { icon: "🥈", title: "Silver Event Badge", material: "Silver" },
      3: { icon: "🥉", title: "Bronze Event Badge", material: "Bronze" },
      4: { icon: "🟤", title: "Copper Event Badge", material: "Copper" },
      5: { icon: "⚙️", title: "Iron Event Badge", material: "Iron" },
    },
    WEIGHT_BELTS: {
      "HEAVYWEIGHT": { icon: "🏆", title: "Heavyweight Belt" },
      "LIGHT HEAVY": { icon: "🏆", title: "Light Heavyweight Belt" },
      "MIDDLEWEIGHT": { icon: "🏆", title: "Middleweight Belt" },
      "WELTERWEIGHT": { icon: "🏆", title: "Welterweight Belt" },
      "LIGHTWEIGHT": { icon: "🏆", title: "Lightweight Belt" },
      "FEATHERWEIGHT": { icon: "🏆", title: "Featherweight Belt" },
      "BANTAMWEIGHT": { icon: "🏆", title: "Bantamweight Belt" },
      "FLYWEIGHT": { icon: "🏆", title: "Flyweight Belt" },
      "STRAWWEIGHT": { icon: "🏆", title: "Strawweight Belt" },
    },

    async _awardTrophies(eventId) {
      const s = ensure(load());
      const rows = await this.getLeaderboard();
      const rank = rows.findIndex(r => r.me) + 1;
      const ev = this.EVENT;
      const add = (t) => { if (!s.trophies.some(x => x.id === t.id)) s.trophies.push(t); };
      // participation badge for everyone who played the card
      add({ id: `${eventId}-played`, season: SEASON, eventId, eventTitle: ev.title,
        kind: "badge", icon: "🥊", title: "Fought the Card", sub: ev.date.split("·")[0].trim() });
      let belt = null;
      if (rank >= 1 && rank <= 5) {
        belt = this.BELTS[rank];
        add({ id: `${eventId}-belt`, season: SEASON, eventId, eventTitle: ev.title,
          kind: "belt", icon: belt.icon, title: belt.title, sub: `#${rank} · ${ev.title}` });
        const badge = this.EVENT_BADGES[rank];
        add({ id: `${eventId}-place-${rank}`, season: SEASON, eventId, eventTitle: ev.title,
          kind: "badge", icon: badge.icon, title: badge.title, sub: `${badge.material} · #${rank} for this event` });
      }
      if (rank === 1) {
        const division = ev.bouts[0]?.weight || "WELTERWEIGHT";
        const divBelt = this.WEIGHT_BELTS[division] || { icon: "🏆", title: `${division} Belt` };
        add({ id: `${eventId}-${division.toLowerCase().replace(/\s+/g, "-")}-belt`, season: SEASON, eventId, eventTitle: ev.title,
          kind: "belt", icon: divBelt.icon, title: divBelt.title, sub: `Most points · ${ev.shortTitle}` });
      }
      save(s);
      return { rank, belt };
    },

    // record for the share card: hits / total / fully-settled?
    async getEventRecord(eventId) {
      const preds = await this.getPredictions(eventId);
      const vals = Object.values(preds);
      const counted = vals.filter(p => !p.voided);     // voided picks don't count
      const settled = counted.filter(p => p.settled);
      return {
        total: counted.length,
        hits: settled.filter(p => p.won > 0).length,
        voided: vals.filter(p => p.voided).length,
        settledCount: vals.filter(p => p.settled).length,
        finished: vals.length > 0 && vals.every(p => p.settled),
      };
    },

    async getTrophies() {
      if (useSupabase) { const c = await getSb();
        const { data } = await c.from("trophies").select("*").eq("user_id", this.user.id).order("id"); return data || []; }
      const s = ensure(load()); return s.trophies || [];
    },
    _membershipItems() {
      if (!this.user || !this.user.createdAt) return [];
      const ageDays = Math.floor((Date.now() - new Date(this.user.createdAt).getTime()) / 86400000);
      const mk = (id, days, icon, title, sub) => ageDays >= days ? { id, kind: "member", icon, title, sub, season: SEASON } : null;
      return [
        { id: "member-started", kind: "member", icon: "🎟️", title: "Octagon Member", sub: "Account created", season: SEASON },
        mk("member-1-month", 30, "📅", "1 Month Member", "Member for 1 month"),
        mk("member-6-months", 182, "🗓️", "6 Month Member", "Member for 6 months"),
        mk("member-1-year", 365, "🌟", "1 Year Member", "Member for 1 year"),
      ].filter(Boolean);
    },
    async getShrineItems() {
      const trophies = await this.getTrophies();
      return [...this._membershipItems(), ...trophies].map(t => ({
        id: t.id, kind: t.kind || "award", icon: t.icon || "🎖️", title: t.title || "Award",
        sub: t.sub || t.eventTitle || "", season: t.season || SEASON,
      }));
    },
    async setShowcaseItem(itemId) {
      const items = await this.getShrineItems();
      const item = items.find(i => i.id === itemId);
      if (!item) throw new Error("That shrine item is not available.");
      if (useSupabase) {
        const c = await getSb();
        const { error } = await c.from("profiles").update({
          showcase_item_id: item.id, showcase_icon: item.icon, showcase_title: item.title,
        }).eq("id", this.user.id);
        if (error) throw new Error(error.message);
      } else {
        const s = ensure(load());
        s.user.showcaseItemId = item.id; s.user.showcaseIcon = item.icon; s.user.showcaseTitle = item.title; save(s);
      }
      this.user.showcaseItemId = item.id; this.user.showcaseIcon = item.icon; this.user.showcaseTitle = item.title;
      window.dispatchEvent(new Event("pko-auth"));
    },

    // ---------- leaderboard ----------
    async getLeaderboard() {
      if (useSupabase) { const c = await getSb();
        const { data } = await c.from("leaderboard").select("*").eq("season", SEASON)
          .order("points", { ascending: false }).limit(100);
        return (data || []).map(r => ({ id: r.user_id, name: r.name, points: r.points,
          showcaseIcon: r.showcase_icon, showcaseTitle: r.showcase_title, me: this.user && r.user_id === this.user.id })); }
      const s = ensure(load()); seedBots(s); save(s);
      const rows = [...s.bots];
      if (this.user && this.user.nameChosen)
        rows.push({ id: this.user.id, name: this.user.name, points: s.points[SEASON] || 0,
          showcaseIcon: this.user.showcaseIcon, showcaseTitle: this.user.showcaseTitle, me: true });
      return rows.sort((a, b) => b.points - a.points);
    },
    async getEventLeaderboard(eventId) {
      if (useSupabase) { const c = await getSb();
        const { data } = await c.from("event_leaderboard").select("*").eq("event_id", eventId)
          .order("event_points", { ascending: false }).order("hits", { ascending: false }).limit(100);
        return (data || []).map(r => ({
          id: r.user_id, name: r.name, eventPoints: Number(r.event_points) || 0,
          committed: Number(r.committed_points) || 0, returned: Number(r.returned_points) || 0,
          hits: Number(r.hits) || 0, misses: Number(r.misses) || 0, voided: Number(r.voided) || 0,
          settled: Number(r.settled_fights) || 0, total: Number(r.total_fights) || 0,
          me: this.user && r.user_id === this.user.id,
        })); }

      const s = ensure(load()); seedBots(s); save(s);
      const rows = s.bots.slice(0, 12).map((b, i) => {
        const total = this.EVENT.bouts.length;
        const settled = this.EVENT.bouts.filter(x => x.result).length;
        const hits = Math.max(0, Math.min(settled, Math.floor((settled + i) / 2)));
        const committed = Math.min(1000, 120 + ((i * 73) % 520));
        const returned = hits * (140 + ((i * 41) % 180));
        return { id: b.id, name: b.name, eventPoints: returned - committed, committed, returned,
          hits, misses: Math.max(0, settled - hits), voided: 0, settled, total, me: false };
      });
      if (this.user && this.user.nameChosen) {
        const preds = Object.values(s.predictions[eventId] || {});
        const settled = preds.filter(p => p.settled && !p.voided);
        const committed = preds.reduce((n, p) => n + (Number(p.stake) || 0), 0);
        const returned = preds.reduce((n, p) => n + (Number(p.won) || 0) + (p.voided ? Number(p.stake) || 0 : 0), 0);
        rows.push({ id: this.user.id, name: this.user.name, eventPoints: returned - committed,
          committed, returned, hits: settled.filter(p => p.won > 0).length,
          misses: settled.filter(p => !p.won).length, voided: preds.filter(p => p.voided).length,
          settled: preds.filter(p => p.settled).length, total: preds.length, me: true });
      }
      return rows.sort((a, b) => b.eventPoints - a.eventPoints || b.hits - a.hits);
    },
  };

  window.PKO = window.PKO || {};
  window.PKO.store = store;
  window.PKO.validateName = validateName;
})();
