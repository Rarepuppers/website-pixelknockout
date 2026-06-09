// ===== PKO app: UI + routing =====
(function () {
  const CFG = window.PKO_CONFIG;
  const store = window.PKO.store;
  const EVENT = window.PKO_EVENT;
  const EVENT_FALLBACK = window.PKO_EVENTS_FALLBACK || [];
  const mult = window.PKO_oddsToMultiplier;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // sprite if the persona has one (persona.img path), else emoji fallback
  const avatarHTML = (f, extra = "") => {
    const inner = f.img ? `<img src="${esc(f.img)}" alt="${esc(f.name)}" />` : (f.emoji || "🥊");
    return `<div class="avatar ${extra}" style="background:${f.color}">${inner}</div>`;
  };
  const UI_ART = {
    empty: "assets/ui/empty-state-arcade.png",
    shareBg: "assets/ui/share-card-bg.png",
    fallbackBadge: "assets/ui/badge-participation.png",
    fallbackBelt: "assets/ui/belt-division.png",
  };
  const rewardAsset = item => {
    const title = String(item?.title || "").toLowerCase();
    if (item?.asset) return item.asset;
    if (title.includes("undisputed")) return "assets/ui/belt-undisputed.png";
    if (title.includes("interim")) return "assets/ui/belt-interim.png";
    if (title.includes("#1 contender")) return "assets/ui/belt-contender.png";
    if (title.includes("top contender")) return "assets/ui/belt-top-contender.png";
    if (title.includes("ranked contender")) return "assets/ui/belt-ranked-contender.png";
    if (title.includes("belt")) return UI_ART.fallbackBelt;
    if (title.includes("gold")) return "assets/ui/badge-gold.png";
    if (title.includes("silver")) return "assets/ui/badge-silver.png";
    if (title.includes("bronze")) return "assets/ui/badge-bronze.png";
    if (title.includes("copper")) return "assets/ui/badge-copper.png";
    if (title.includes("iron")) return "assets/ui/badge-iron.png";
    if (title.includes("fought the card")) return "assets/ui/badge-participation.png";
    return null;
  };
  const rewardArtHTML = (item, cls = "reward-art") => {
    const asset = rewardAsset(item);
    return asset
      ? `<img class="${cls}" src="${esc(asset)}" alt="${esc(item?.title || "Reward")}" loading="lazy" />`
      : `<span class="${cls} text">${esc(item?.icon || "PKO")}</span>`;
  };
  const emptyArtHTML = text => `<div class="empty-state with-art"><img src="${esc(UI_ART.empty)}" alt="" loading="lazy" /><span>${esc(text)}</span></div>`;
  const flagSlug = country => {
    const key = String(country || "Parts Unknown").toLowerCase();
    const map = {
      "united states (hawaii)": "hawaii",
      "united states": "united-states",
      "united arab emirates": "united-arab-emirates",
      "dominican republic": "dominican-republic",
      "new zealand": "new-zealand",
      "south africa": "south-africa",
      "parts unknown": "unknown",
    };
    return map[key] || key.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
  };
  const flagHTML = (country, shape = "square") => {
    const dir = shape === "rect" ? "64x48" : "64x64";
    const slug = flagSlug(country);
    return `<img class="flag-img ${shape}" src="assets/flags/${dir}/${slug}.png" alt="${esc(country || "Unknown")} pixel flag" loading="lazy" />`;
  };

  const rankLabel = r => !r ? "UR" : (r.champion ? "C" : (r.interim ? "IC" : `#${r.rank}`));
  const rankTitle = r => !r ? "Unranked" : `${r.division} ${r.champion ? "Champion" : r.interim ? "Interim Champion" : "rank " + r.rank}${r.p4p ? ` · P4P #${r.p4p}` : ""}`;
  const rankChip = (r, extra = "") => `<span class="rank-chip ${r?.champion ? "champ" : ""} ${r?.interim ? "interim" : ""} ${!r ? "unranked" : ""} ${extra}" title="${esc(rankTitle(r))}">${esc(rankLabel(r))}</span>`;

  let draft = {}; // boutId -> {pick, stake}
  let currentPoints = 0;
  let leaderboardMode = "overall";
  let adminQuery = "";
  let adminSelectedUserId = null;
  const gatedStaticViews = {};
  const isPlayableBout = b => b.playable !== false && (b.cardSection || "main") === "main";
  const playableBouts = () => EVENT.bouts.filter(isPlayableBout);
  const scheduleOnlyBouts = () => EVENT.bouts.filter(b => !isPlayableBout(b));

  // predictions lock at the card's start time
  const cardLocked = () => EVENT.lockTime && Date.now() >= new Date(EVENT.lockTime).getTime();
  const activeBonuses = () => (EVENT.bonusWindows || []).filter(b => {
    const now = Date.now();
    return now >= new Date(b.startTime).getTime() && now <= new Date(b.endTime).getTime();
  });

  // ---------- countdown ----------
  function fmtCountdown(ms) {
    const s = Math.floor(ms / 1000), d = Math.floor(s / 86400),
      h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }
  function renderCountdown() {
    const el = $("#lock-timer"); if (!el || !EVENT.lockTime) return;
    const diff = new Date(EVENT.lockTime).getTime() - Date.now();
    if (diff <= 0) { el.innerHTML = "🔒 Predictions are CLOSED — card in progress"; el.className = "lock-timer closed"; }
    else { el.innerHTML = `⏳ Predictions lock in <strong>${fmtCountdown(diff)}</strong>`;
      el.className = "lock-timer" + (diff < 6 * 3600 * 1000 ? " soon" : ""); }
  }

  // ---------- fighter profile ----------
  function openFighterProfile(f) {
    const facts = (f.facts || []).map(x => `<li>${esc(x)}</li>`).join("");
    const quotes = (f.quotes || []).map(x => `<li>“${esc(x)}”</li>`).join("");
    const jokes = (f.jokes || []).map(x => `<li>${esc(x)}</li>`).join("");
    $("#fighter-body").innerHTML = `
      <div class="profile-head">
        ${avatarHTML(f, "big")}
        <div><h1>${esc(f.name)}</h1>
          <p class="rank-line">${rankChip(f.ranking)} ${f.ranking ? esc(rankTitle(f.ranking)) : "Unranked"}</p>
          <p class="muted">as ${esc(f.real)} · <span class="flag" title="${esc(f.country || "Parts Unknown")}">${flagHTML(f.country || "Parts Unknown")}</span> ${esc(f.country || "Parts Unknown")}</p>
          <p class="fighter-tag">${esc(f.tag)}</p></div>
      </div>
      <h2 style="margin-top:18px">📋 Real facts</h2>
      <ul class="facts">${facts}</ul>
      ${quotes ? `<h2>🎙️ Quote board</h2><ul class="facts quotes">${quotes}</ul>` : ""}
      <h2>😂 Fun facts <span class="small muted">(parody — totally made up)</span></h2>
      <ul class="facts fun">${jokes}</ul>`;
    $("#fighter-modal").classList.remove("hidden");
  }
  window.PKO.openFighterProfile = openFighterProfile;

  // ---------- routing ----------
  function route(name, opts = {}) {
    $$(".view").forEach(v => v.classList.add("hidden"));
    const view = $("#view-" + name);
    const resolved = view ? name : "play";
    const resolvedView = view || $("#view-play");
    if (resolvedView) resolvedView.classList.remove("hidden");
    if (!opts.skipHash && window.location.hash !== "#" + resolved) {
      history.pushState(null, "", "#" + resolved);
    }
    $$(".nav-link[data-route]").forEach(l => l.classList.toggle("active", l.dataset.route === resolved));
    if (resolved === "leaderboard") renderLeaderboard();
    if (resolved === "events") renderEvents();
    if (resolved === "play") renderPlay();
    if (resolved === "profile") renderProfile();
    if (resolved === "roster") renderRoster();
    if (resolved === "legends") renderLegends();
    if (resolved === "admin") renderAdminResults();
    if (resolved === "priorities") renderPriorities();
    if (resolved === "ops") renderOps();
    if (resolved === "season") {
      const el = $("#season-current");
      if (el) el.textContent = CFG.CURRENT_SEASON;
    }
  }
  $$("[data-route]").forEach(l => l.addEventListener("click", e => { e.preventDefault(); route(l.dataset.route); }));
  window.addEventListener("hashchange", () => route((window.location.hash || "#play").slice(1), { skipHash: true }));

  async function renderPriorities() {
    const view = $("#view-priorities");
    if (!view) return;
    gatedStaticViews.priorities = gatedStaticViews.priorities || view.innerHTML;
    if (await store.isAdmin()) {
      view.innerHTML = gatedStaticViews.priorities;
      return;
    }
    view.innerHTML = `<p class="kicker">ADMIN ONLY</p><h1>Priorities</h1><div class="empty-state">This internal roadmap is available only to approved admins.</div>`;
  }

  async function renderOps() {
    const view = $("#view-ops");
    if (!view) return;
    gatedStaticViews.ops = gatedStaticViews.ops || view.innerHTML;
    if (await store.isAdmin()) {
      view.innerHTML = gatedStaticViews.ops;
      return;
    }
    view.innerHTML = `<p class="kicker">ADMIN ONLY</p><h1>Operator Notes</h1><div class="empty-state">Operator notes are available only to approved admins.</div>`;
  }

  // ---------- account box ----------
  function renderAccount() {
    const box = $("#account-box");
    if (store.user && store.user.nameChosen) {
      const mark = store.user.showcaseIcon ? `<span class="showcase-mini" title="${esc(store.user.showcaseTitle || "Showcase item")}">${esc(store.user.showcaseIcon)}</span>` : "👤";
      box.innerHTML = `<a class="acct-name" href="#profile" id="acct-link">${mark} ${esc(store.user.name)}</a>
        <button class="btn btn-ghost" id="btn-signout">Sign out</button>`;
      $("#acct-link").onclick = e => { e.preventDefault(); route("profile"); };
      $("#btn-signout").onclick = async () => { await store.signOut(); };
    } else {
      box.innerHTML = `<button class="btn btn-primary" id="btn-signin">Sign in</button>`;
      $("#btn-signin").onclick = openAuth;
    }
  }

  // ---------- play view ----------
  function oddsSourceLabel() {
    if (EVENT.oddsSource === "live") return "card difficulty updated";
    if (EVENT.oddsSource === "generated") return "cached card difficulty";
    if (EVENT.oddsSource === "cached") return "card difficulty ready";
    if (EVENT.oddsSource === "placeholder") return "default card difficulty";
    return "card difficulty ready";
  }

  async function renderPlay() {
    await applyOfficialBoutResults();
    $("#event-title").textContent = EVENT.title;
    $("#event-date").textContent = EVENT.date + " · Season " + EVENT.season;
    $("#event-real").textContent = `${EVENT.realTitle} · ${oddsSourceLabel()}`;

    const signed = store.user && store.user.nameChosen;
    const pts = signed ? await store.getPoints() : CFG.POINTS_SIGNUP;
    currentPoints = pts;
    $("#bank-value").textContent = pts;
    $("#bank-note").textContent = signed ? "+10/day · +1000/event" : "(sign in to save)";
    await renderBonusPanel(signed);

    const existing = signed ? await store.getPredictions(EVENT.id) : {};
    const timeLocked = cardLocked();
    const hasPicks = playableBouts().some(b => existing[b.id]);
    const locked = hasPicks || timeLocked;
    renderHomeEventHub({ signed, pts, existing, timeLocked, hasPicks, locked });
    renderHomeQuickGuide();

    const wrap = $("#bouts"); wrap.innerHTML = "";
    if (playableBouts().length) {
      wrap.insertAdjacentHTML("beforeend", `<div class="card-section-label"><p class="kicker">SELECTED MAIN CARD</p><h2>Playable matchups</h2><p class="muted small">Only selected main-card bouts use Glory Points and count toward the event leaderboard.</p></div>`);
      playableBouts().forEach(b => wrap.appendChild(renderBout(b, existing[b.id], locked)));
    }
    if (scheduleOnlyBouts().length) {
      wrap.insertAdjacentHTML("beforeend", `<div class="card-section-label undercard"><p class="kicker">UNDERCARD</p><h2>Schedule only</h2><p class="muted small">These matchups are listed for card context. No PKO picks or prediction pricing are available for undercard bouts.</p></div>`);
      scheduleOnlyBouts().forEach(b => wrap.appendChild(renderBout(b, existing[b.id], true)));
    }
    updateStakeSummary(locked);
    renderNewsletterSignup($("#home-newsletter"), { compact: true });
    renderHomeFutureEvents();
    renderHomeFighterShowcase();
    renderHomeLeaderboardShowcase();

    const submit = $("#submit-picks");
    submit.textContent = (timeLocked && !hasPicks) ? "PREDICTIONS CLOSED"
      : (hasPicks ? "PREDICTIONS LOCKED" : "LOCK IN PREDICTIONS");
    submit.disabled = locked; submit.style.opacity = locked ? .6 : 1;
    if (timeLocked && !hasPicks && !$("#play-msg").textContent)
      $("#play-msg").textContent = "⏰ Predictions are closed — the card has started.";

    // dev: resolve fights one at a time so leaderboard moves after each fight.
    // The "void" button simulates a real fight being scratched (stake refunded).
    ["#dev-settle", "#dev-void"].forEach(id => { const e = $(id); if (e) e.remove(); });
    const anyOpen = CFG.ENABLE_DEMO_SETTLEMENT && locked && playableBouts().some(b => existing[b.id] && !existing[b.id].settled);
    if (anyOpen) {
      const resolve = async (opts) => {
        const r = await store.settleNextBout(EVENT.id, opts);
        if (r.done) return;
        let msg;
        if (r.voided) msg = `⚖️ Bout cancelled — ${r.stake} Glory Points refunded (no win/loss).`;
        else { const who = r.bout[r.bout.demoWinner].name;
          msg = r.hit ? `✅ ${who} won — you banked +${r.won} Glory Points!`
                      : `❌ ${who} won — your pick missed.`; }
        if (r.finished) {
          msg += ` 🏁 Card complete!`;
          if (r.awarded && r.awarded.belt) msg += ` You finished #${r.awarded.rank} and earned the ${r.awarded.belt.icon} ${r.awarded.belt.title} belt — check your Profile!`;
          else if (r.awarded) msg += ` You finished #${r.awarded.rank}. Belts go to the top 5 — check your Profile for badges.`;
        }
        $("#play-msg").textContent = msg;
        renderPlay();
        if (!$("#view-leaderboard").classList.contains("hidden")) renderLeaderboard();
      };
      const mk = (id, label, opts) => {
        const b = document.createElement("button");
        b.id = id; b.className = "btn btn-ghost"; b.style.marginLeft = "10px";
        b.textContent = label; b.onclick = () => resolve(opts);
        $(".play-footer").appendChild(b);
      };
      mk("dev-settle", "⚙ Resolve next fight (demo)", {});
      mk("dev-void", "⚖️ Void next fight (demo)", { void: true });
    }

    // share button once the card is fully settled
    const oldShare = $("#play-share"); if (oldShare) oldShare.remove();
    if (signed) {
      const rec = await store.getEventRecord(EVENT.id);
      if (rec.finished) {
        const sh = document.createElement("button");
        sh.id = "play-share"; sh.className = "btn btn-primary"; sh.style.marginLeft = "10px";
        sh.textContent = "📣 Share my result";
        sh.onclick = () => window.PKO.openShare();
        $(".play-footer").appendChild(sh);
      }
    }
  }

  async function applyOfficialBoutResults() {
    try {
      const results = await store.getBoutResults(EVENT.id);
      EVENT.bouts.forEach(b => {
        const r = results[b.id];
        if (!r) return;
        b.result = r.result === "cancelled" ? "void" : r.result;
        b.winType = r.winType || r.methodDetail || b.winType || "";
      });
    } catch {}
  }

  async function renderBonusPanel(signed) {
    const panel = $("#bonus-panel");
    const bonuses = activeBonuses();
    if (!panel || !bonuses.length) { if (panel) panel.classList.add("hidden"); return; }

    const claims = signed ? await store.getBonusClaims() : {};
    const available = bonuses.filter(b => !claims[b.id]);
    if (!available.length) { panel.classList.add("hidden"); return; }

    panel.classList.remove("hidden");
    panel.innerHTML = `<p class="kicker">LIVE EVENT BONUS</p>
      <div class="bonus-actions">${available.map(b => `<button class="btn btn-primary bonus-claim" data-bonus="${esc(b.id)}">
        Claim ${b.amount} pts
      </button>`).join("")}</div>
      <p class="muted small">${available.map(b => `${esc(b.label)}: ${esc(b.description)}`).join(" ")}</p>`;

    $$(".bonus-claim", panel).forEach(btn => {
      btn.onclick = async () => {
        if (!store.user || !store.user.nameChosen) { openAuth(); return; }
        const bonus = available.find(b => b.id === btn.dataset.bonus);
        try {
          await store.claimEventBonus(bonus);
          $("#play-msg").textContent = `Claimed +${bonus.amount} Glory Points.`;
          renderPlay();
        } catch (e) {
          $("#play-msg").textContent = "⚠ " + e.message;
        }
      };
    });
  }

  function eventStatusText(timeLocked, hasPicks) {
    if (cardLocked()) return "Live now - picks locked";
    if (hasPicks) return "Predictions locked";
    return "Open for predictions";
  }

  function formatStatusTimestamp() {
    return formatPulledAt(new Date());
  }

  function renderHomeEventHub(state) {
    const target = $("#home-event-hub");
    if (!target) return;
    const playable = playableBouts();
    const settled = playable.filter(b => b.result).length;
    const total = playable.length;
    const nextOpen = playable.find(b => !b.result);
    target.innerHTML = `<section class="home-panel event-hub">
      <div>
        <p class="kicker">${state.timeLocked ? "EVENT LIVE / LOCKED" : "NEXT EVENT"}</p>
        <h2>${esc(EVENT.shortTitle || EVENT.title)}</h2>
        <p>${esc(EVENT.realTitle)} · ${esc(eventStatusText(state.timeLocked, state.hasPicks))}</p>
        <p class="small muted">${esc(EVENT.date)} · ${settled}/${total} fights settled${nextOpen ? ` · Next: ${esc(nextOpen.weight)}` : ""}</p>
        <p class="small muted">Card status viewed ${esc(formatStatusTimestamp())}</p>
      </div>
      <div class="event-hub-actions">
        <a class="btn btn-primary" href="#bouts">Pick fighters</a>
        <button class="btn btn-ghost" data-route="leaderboard" data-lb-open="event">Event leaderboard</button>
      </div>
    </section>`;
    const eventBtn = target.querySelector("[data-lb-open]");
    if (eventBtn) eventBtn.onclick = e => { e.preventDefault(); leaderboardMode = "event"; route("leaderboard"); };
  }

  function renderHomeQuickGuide() {
    const target = $("#home-quick-guide");
    if (!target) return;
    target.innerHTML = `<section class="home-panel quick-guide">
      <div>
        <p class="kicker">HOW PKO WORKS</p>
        <h2>Pick fighters, track points, chase bragging rights</h2>
        <p>Choose pixel fighters from selected main-card matchups, commit only the free Glory Points you already have, then follow the event leaderboard as official results are settled. Undercard bouts are listed for schedule context only.</p>
      </div>
      <div class="quick-steps">
        <span>1. Claim free points</span>
        <span>2. Lock picks</span>
        <span>3. Follow results</span>
      </div>
      <div class="event-hub-actions">
        <button class="btn btn-ghost" data-route="rules">Rules</button>
        <button class="btn btn-ghost" data-route="how">Full guide</button>
      </div>
    </section>`;
    $$("[data-route]", target).forEach(btn => btn.onclick = e => { e.preventDefault(); route(btn.dataset.route); });
  }

  async function renderHomeFutureEvents() {
    const target = $("#home-future-events");
    if (!target) return;
    const render = (events, source, pulledAt) => {
      target.innerHTML = `<section class="home-panel">
        <div class="section-head">
          <div><p class="kicker">FUTURE EVENTS</p><h2>Next cards</h2></div>
          <button class="btn btn-ghost" data-route="events">Full events</button>
        </div>
        <div class="home-card-grid">
          ${events.slice(0, 3).map(ev => `<article class="event-card">
            <p class="event-date">${esc(ev.date)}</p><h2>${esc(ev.event)}</h2>
            <p>${esc(ev.venue)}</p><p class="muted">${esc(ev.location)}</p>
          </article>`).join("")}
        </div>
        <p class="muted small">${esc(source)} · schedule last pulled ${esc(formatPulledAt(pulledAt || new Date()))}</p>
        <p class="muted small">Unofficial schedule display. Verify fight cards and start times against UFC.com.</p>
      </section>`;
      $$("[data-route]", target).forEach(btn => btn.onclick = e => { e.preventDefault(); route(btn.dataset.route); });
    };
    try {
      const events = await fetchUpcomingEvents();
      render(events.length ? events : EVENT_FALLBACK, events.length ? "Live schedule" : "Fallback schedule", events.pulledAt);
    } catch {
      const cached = getCachedUpcomingEvents(CFG.EVENTS_CACHE_MINUTES || 30, true);
      render(cached || EVENT_FALLBACK, cached ? "Cached schedule" : "Fallback schedule", cached?.pulledAt || new Date());
    }
  }

  function renderHomeFighterShowcase() {
    const target = $("#home-fighter-showcase");
    if (!target) return;
    const fighters = EVENT.bouts.flatMap(b => [b.a, b.b]).slice(0, 6);
    target.innerHTML = `<section class="home-panel">
      <div class="section-head">
        <div><p class="kicker">PIXEL FIGHTERS</p><h2>Tonight's roster</h2></div>
        <button class="btn btn-ghost" data-route="roster">Full roster</button>
      </div>
      <div class="fighter-showcase-grid">
        ${fighters.map(f => `<button class="fighter-mini" data-real="${esc(f.real)}">
          ${avatarHTML(f)}
          <strong>${esc(f.name)}</strong>
          <span>as ${esc(f.real)}</span>
        </button>`).join("")}
      </div>
    </section>`;
    $$(".fighter-mini", target).forEach(btn => btn.onclick = () => {
      const fighter = fighters.find(f => f.real === btn.dataset.real);
      if (fighter) openFighterProfile(fighter);
    });
    $$("[data-route]", target).forEach(btn => btn.onclick = e => { e.preventDefault(); route(btn.dataset.route); });
  }

  async function renderHomeLeaderboardShowcase() {
    const target = $("#home-leaderboard-showcase");
    if (!target) return;
    const [overall, eventRows] = await Promise.all([store.getLeaderboard(), store.getEventLeaderboard(EVENT.id)]);
    const row = (r, value) => `<li><span>${esc(r.name)}</span><strong>${value}</strong></li>`;
    target.innerHTML = `<section class="home-panel">
      <div class="section-head">
        <div><p class="kicker">BRAGGING RIGHTS</p><h2>Leaderboard watch</h2></div>
        <button class="btn btn-ghost" data-route="leaderboard">All leaders</button>
      </div>
      <div class="leader-preview-grid">
        <div><h3>Overall</h3><ol>${overall.slice(0, 5).map(r => row(r, `${r.points} pts`)).join("")}</ol></div>
        <div><h3>${esc(EVENT.shortTitle)} event</h3><ol>${eventRows.slice(0, 5).map(r => row(r, `${r.eventPoints >= 0 ? "+" : ""}${r.eventPoints} pts`)).join("")}</ol></div>
      </div>
    </section>`;
    $$("[data-route]", target).forEach(btn => btn.onclick = e => { e.preventDefault(); route(btn.dataset.route); });
  }

  function renderBout(b, pred, locked) {
    const playable = isPlayableBout(b);
    const el = document.createElement("div");
    el.className = "bout" + (playable ? "" : " schedule-only");
    el.innerHTML = `<div class="bout-weight">${playable ? "MAIN CARD" : "UNDERCARD"} | ${b.weight}</div>
      <div class="matchup">${fighterCard(b.a, "a", b.oddsA, pred, locked)}
        <div class="vs">VS</div>
        ${fighterCard(b.b, "b", b.oddsB, pred, locked)}</div>
      ${boutOutcomeHTML(b, locked, pred)}`;

    if (!playable) {
      const note = document.createElement("div");
      note.className = "schedule-only-note";
      note.innerHTML = `<strong>Undercard - schedule only</strong><span>No PKO picks or prediction pricing available for this bout.</span>`;
      el.appendChild(note);
    } else if (!locked) {
      const stake = Math.min((draft[b.id] && draft[b.id].stake) || Math.min(100, currentPoints), currentPoints);
      draft[b.id] = Object.assign({ pick: null }, draft[b.id], { stake });
      const row = document.createElement("div");
      row.className = "stake-row";
      row.innerHTML = `<span class="small muted">Points:</span>
        <input type="range" min="0" max="${currentPoints}" step="10" value="${stake}" />
        <span class="stake-val">${stake} pts</span>
        <div class="stake-terms" aria-live="polite"></div>`;
      const slider = row.querySelector("input"), val = row.querySelector(".stake-val");
      slider.oninput = () => {
        draft[b.id] = Object.assign({ pick: null }, draft[b.id], { stake: +slider.value });
        clampDraftStakes(b.id);
        val.textContent = draft[b.id].stake + " pts";
        slider.value = draft[b.id].stake;
        updateStakeTerms(el, b);
        updateStakeSummary(false);
      };
      el.appendChild(row);
      $$(".fighter", el).forEach(f => f.onclick = () => {
        $$(".fighter", el).forEach(x => x.classList.remove("picked"));
        f.classList.add("picked");
        draft[b.id] = Object.assign({ stake: Math.min(100, currentPoints) }, draft[b.id], { pick: f.dataset.side });
        clampDraftStakes(b.id);
        val.textContent = draft[b.id].stake + " pts";
        slider.value = draft[b.id].stake;
        updateStakeTerms(el, b);
        updateStakeSummary(false);
      });
      updateStakeTerms(el, b);
    } else if (pred) {
      const who = b[pred.pick].name;
      const r = document.createElement("div"); r.className = "bout-result";
      if (pred.voided) { r.className += " void";
        r.innerHTML = `⚖️ Bout cancelled — <strong>${pred.stake} pts refunded</strong> (no win/loss)`; }
      else if (pred.settled) r.innerHTML = pred.won > 0
        ? `✅ <span style="color:var(--green)">${esc(who)}</span> won — +${pred.won} pts`
        : `❌ ${esc(who)} lost — ${pred.stake} pts gone`;
      else r.innerHTML = `🔒 Predicted <strong>${esc(who)}</strong> · ${pred.stake} pts · multiplier ${pred.multiplier.toFixed(2)}x`;
      el.appendChild(r);
    }
    // info buttons open the fighter profile (works locked or not)
    $$(".fighter-info", el).forEach(btn => btn.onclick = (e) => {
      e.stopPropagation(); openFighterProfile(b[btn.dataset.side]);
    });
    return el;
  }

  function fighterCard(f, side, odds, pred, locked) {
    const m = mult(odds).toFixed(2);
    let cls = "fighter";
    if (pred && pred.pick === side) cls += " picked";
    if (pred && pred.settled) cls += (pred.pick === side && pred.won > 0) ? " win" : (pred.pick === side ? " lose" : "");
    const oddsStr = (odds > 0 ? "+" : "") + odds;
    return `<div class="${cls}" data-side="${side}" ${locked ? 'style="cursor:default"' : ""}>
      <button class="fighter-info" data-side="${side}" title="View ${esc(f.name)}'s profile">ℹ︎</button>
      ${avatarHTML(f)}
      <div class="fighter-rankline">${f.ranking ? rankChip(f.ranking) + " " + esc(rankTitle(f.ranking)) : "UR · unranked"}</div>
      <div class="fighter-name"><span class="flag" title="${esc(f.country || "Parts Unknown")}">${f.flag || "🏴"}</span> ${esc(f.name)}</div>
      <div class="fighter-real">as ${esc(f.real)}</div>
      <div class="fighter-tag">${esc(f.tag)}</div>
      <div class="fighter-odds">difficulty ${oddsStr}</div>
      <div class="fighter-mult">multiplier ${m}x</div>
    </div>`;
  }

  function outcomeMethod(b) {
    return b.winType || b.method || "";
  }

  function boutOutcomeHTML(b, locked, pred) {
    const result = b.result || (pred && pred.result);
    let cls = "pending", label = "Fight not yet started";
    if (result === "void" || b.voided || pred?.voided) {
      cls = "void"; label = "Fight cancelled";
    } else if (result === "draw") {
      cls = "draw"; label = "Draw";
    } else if (result === "a" || result === "b") {
      const method = outcomeMethod(b);
      cls = "final";
      label = `Winner: ${b[result].name}${method ? ` (${method})` : ""}`;
    } else if (locked) {
      cls = "locked"; label = "In progress - predictions locked";
    }
    return `<div class="bout-outcome ${cls}"><span>Outcome</span><strong>${esc(label)}</strong></div>`;
  }

  function committedPoints() {
    return playableBouts().reduce((sum, b) => {
      const d = draft[b.id];
      return sum + (d && d.pick ? d.stake : 0);
    }, 0);
  }

  function clampDraftStakes(activeBoutId) {
    const active = draft[activeBoutId];
    if (!active) return;
    const otherCommitted = playableBouts().reduce((sum, b) => {
      const d = draft[b.id];
      return sum + (b.id !== activeBoutId && d && d.pick ? d.stake : 0);
    }, 0);
    const maxForActive = Math.max(0, currentPoints - otherCommitted);
    active.stake = Math.min(active.stake || 0, maxForActive);

    $$(".bout:not(.schedule-only)").forEach((el, i) => {
      const bout = playableBouts()[i];
      if (!bout) return;
      const d = draft[bout.id] || {};
      const other = committedPoints() - (d.pick ? (d.stake || 0) : 0);
      const max = Math.max(0, currentPoints - other);
      const slider = el.querySelector("input[type=range]");
      const val = el.querySelector(".stake-val");
      if (!slider) return;
      slider.max = max;
      if ((d.stake || 0) > max) d.stake = max;
      slider.value = d.stake || 0;
      if (val) val.textContent = (d.stake || 0) + " pts";
      updateStakeTerms(el, bout);
    });
  }

  function updateStakeTerms(el, b) {
    const terms = el.querySelector(".stake-terms");
    if (!terms) return;
    const d = draft[b.id] || {};
    if (!d.pick || !d.stake) {
      terms.innerHTML = `<span class="stake-term-label">Pick a side</span><strong>0 pts</strong><span>cost / payout</span>`;
      return;
    }
    const odds = d.pick === "a" ? b.oddsA : b.oddsB;
    const payout = Math.floor(d.stake * mult(odds));
    const pct = currentPoints ? Math.round((d.stake / currentPoints) * 100) : 0;
    terms.innerHTML = `<span class="stake-term-label">Cost / payout</span><strong>${d.stake} / ${payout} pts</strong><span>${pct}% of points · ${mult(odds).toFixed(2)}x</span>`;
  }

  function updateStakeSummary(locked) {
    const box = $("#stake-summary");
    if (!box) return;
    if (locked) { box.classList.add("hidden"); box.innerHTML = ""; return; }
    const committed = committedPoints();
    const remaining = Math.max(0, currentPoints - committed);
    const pct = currentPoints ? Math.round((committed / currentPoints) * 100) : 0;
    box.classList.remove("hidden");
    box.innerHTML = `<div><span class="bank-label">COMMITTED</span><strong>${committed} pts</strong></div>
      <div><span class="bank-label">REMAINING</span><strong>${remaining} pts</strong></div>
      <div><span class="bank-label">CARD RISK</span><strong>${pct}%</strong></div>`;
  }

  function buildDraftPicks() {
    const picks = [];
    for (const b of playableBouts()) {
      const d = draft[b.id];
      if (d && d.pick && d.stake > 0) {
        const odds = d.pick === "a" ? b.oddsA : b.oddsB;
        picks.push({ boutId: b.id, pick: d.pick, stake: d.stake, multiplier: +mult(odds).toFixed(4) });
      }
    }
    return picks;
  }

  function closeLockConfirm() {
    $("#lock-confirm-modal").classList.add("hidden");
  }

  function openLockConfirm(picks) {
    const picked = new Set(picks.map(p => p.boutId));
    const missing = playableBouts().filter(b => !picked.has(b.id));
    $("#lock-confirm-body").innerHTML = missing.length
      ? `<strong>Unpicked main-card matchups</strong><ul>${missing.map(b => `<li>${esc(b.a.real)} vs ${esc(b.b.real)}</li>`).join("")}</ul>`
      : `<strong>All playable main-card matchups have picks.</strong>`;
    $("#lock-confirm-modal").classList.remove("hidden");
  }

  async function submitDraftPicks() {
    const picks = buildDraftPicks();
    if (!picks.length) { $("#play-msg").textContent = "Pick at least one winner and set points."; return; }
    try { await store.submitPicks(EVENT.id, picks);
      closeLockConfirm();
      $("#play-msg").textContent = "Locked in! Difficulty multipliers are frozen on your picks. Good luck PKO";
      draft = {}; renderPlay();
    } catch (e) { $("#play-msg").textContent = "Warning " + e.message; }
  }

  $("#submit-picks").onclick = async () => {
    if (!store.user || !store.user.nameChosen) { openAuth(); return; }
    const picks = buildDraftPicks();
    if (!picks.length) { $("#play-msg").textContent = "Pick at least one winner and set points."; return; }
    if (picks.length < playableBouts().length) { openLockConfirm(picks); return; }
    await submitDraftPicks();
  };

  $("#lock-confirm-close").onclick = closeLockConfirm;
  $("#lock-confirm-no").onclick = closeLockConfirm;
  $("#lock-confirm-modal").addEventListener("click", e => { if (e.target.id === "lock-confirm-modal") closeLockConfirm(); });
  $("#lock-confirm-yes").onclick = submitDraftPicks;

  // ---------- leaderboard ----------
  async function renderLeaderboard() {
    $("#season-year").textContent = CFG.CURRENT_SEASON;
    $$(".leaderboard-tabs [data-lb]").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.lb === leaderboardMode);
      btn.onclick = () => { leaderboardMode = btn.dataset.lb; renderLeaderboard(); };
    });
    const rows = leaderboardMode === "event" ? await store.getEventLeaderboard(EVENT.id) : await store.getLeaderboard();
    const list = $("#leaderboard-list"); list.innerHTML = "";
    const note = $("#leaderboard-note");
    if (!rows.length) {
      list.innerHTML = `<li>${emptyArtHTML("No leaderboard entries yet. Sign in, choose a fighter name, and lock predictions for the current card.")}</li>`;
      if (note) note.textContent = "";
      return;
    }
    if (note) note.textContent = leaderboardMode === "event"
      ? `${EVENT.shortTitle} event leaderboard. Updates after each settled fight. Event points are returned points minus committed points for this card. Viewed ${formatStatusTimestamp()}.`
      : `Overall leaderboard ranks total season Glory Points after grants, predictions, refunds, and settled outcomes. Viewed ${formatStatusTimestamp()}.`;
    rows.slice(0, 100).forEach((r, i) => {
      const rank = i + 1, belt = store.BELTS[rank];
      const li = document.createElement("li");
      li.className = "lb-row" + (r.me ? " me" : "") + (rank <= 5 ? " top5" : "");
      li.innerHTML = leaderboardMode === "event" ? eventLeaderboardRow(r, rank) : overallLeaderboardRow(r, rank, belt);
      list.appendChild(li);
    });
  }

  function overallLeaderboardRow(r, rank, belt) {
    return `<span class="lb-rank">#${rank}</span>
      <span class="lb-belt">${belt ? rewardArtHTML(belt, "lb-reward-art") : ""}</span>
      <span class="lb-showcase" title="${esc(r.showcaseTitle || "No shrine item selected")}">${r.showcaseIcon ? esc(r.showcaseIcon) : ""}</span>
      <span class="lb-name">${esc(r.name)}${belt ? `<span class="lb-title">${belt.title}</span>` : ""}</span>
      <span class="lb-pts">${r.points} pts</span>`;
  }

  function eventLeaderboardRow(r, rank) {
    return `<span class="lb-rank">#${rank}</span>
      <span class="lb-belt">${rank <= 5 ? "PKO" : ""}</span>
      <span class="lb-name">${esc(r.name)}</span>
      <span class="lb-event-stats">${r.hits}-${r.misses}${r.voided ? ` | ${r.voided} void` : ""} | ${r.settled}/${r.total} settled</span>
      <span class="lb-pts">${r.eventPoints >= 0 ? "+" : ""}${r.eventPoints} pts</span>`;
  }

  // ---------- future events ----------
  const UPCOMING_EVENT_LIMIT = 2;
  const EVENTS_CACHE_KEY = "pko_upcoming_events_cache_v1";

  function parseEventDate(dateText) {
    const t = Date.parse(dateText);
    return Number.isFinite(t) ? new Date(t) : null;
  }

  function cleanWikiText(s) {
    return String(s || "")
      .replace(/\[[^\]]+\]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function formatPulledAt(date = new Date()) {
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  }

  function findScheduledEventsTable(doc) {
    const heading = doc.querySelector("#Scheduled_events");
    let node = heading ? heading.closest("h2") : null;
    while (node && node.nextElementSibling) {
      node = node.nextElementSibling;
      if (node.matches && node.matches("table")) return node;
      const table = node.querySelector && node.querySelector("table");
      if (table) return table;
    }
    return doc.querySelector("table.wikitable");
  }

  function getCachedUpcomingEvents(maxAgeMinutes = CFG.EVENTS_CACHE_MINUTES || 30, allowStale = false) {
    try {
      const cached = JSON.parse(localStorage.getItem(EVENTS_CACHE_KEY));
      if (!cached || !Array.isArray(cached.events) || !cached.pulledAt) return null;
      const ageMs = Date.now() - cached.pulledAt;
      if (!allowStale && ageMs > maxAgeMinutes * 60 * 1000) return null;
      const events = cached.events.map(ev => ({ ...ev, parsed: ev.parsed ? new Date(ev.parsed) : null }));
      events.pulledAt = new Date(cached.pulledAt);
      events.stale = ageMs > maxAgeMinutes * 60 * 1000;
      return events;
    } catch {
      return null;
    }
  }

  function setCachedUpcomingEvents(events) {
    try {
      localStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify({
        pulledAt: Date.now(),
        events: events.map(ev => ({
          event: ev.event,
          date: ev.date,
          venue: ev.venue,
          location: ev.location,
          parsed: ev.parsed ? ev.parsed.toISOString() : null,
        })),
      }));
    } catch {}
  }

  function getGeneratedUpcomingEvents() {
    const generated = window.PKO_GENERATED_CONTENT || {};
    const rows = Array.isArray(generated.upcomingEvents) ? generated.upcomingEvents : [];
    if (!rows.length) return null;
    const pulledAt = generated.updatedAt ? new Date(generated.updatedAt) : new Date();
    const events = rows.map(ev => ({
      event: ev.event,
      date: ev.date,
      venue: ev.venue,
      location: ev.location,
      parsed: ev.parsed ? new Date(ev.parsed) : parseEventDate(ev.date),
      sourceUrl: ev.sourceUrl,
    })).filter(ev => ev.event && ev.date);
    events.pulledAt = pulledAt;
    events.generated = true;
    return events;
  }

  async function fetchUpcomingEvents() {
    const cached = getCachedUpcomingEvents();
    if (cached) return cached;
    const generated = getGeneratedUpcomingEvents();
    if (generated) return generated;

    const url = "https://en.wikipedia.org/w/api.php?action=parse&page=List_of_UFC_events&prop=text&format=json&origin=*";
    const data = await (await fetch(url)).json();
    const html = data && data.parse && data.parse.text && data.parse.text["*"];
    if (!html) throw new Error("Wikipedia response did not include page HTML.");

    const doc = new DOMParser().parseFromString(html, "text/html");
    const table = findScheduledEventsTable(doc);
    if (!table) throw new Error("Scheduled events table was not found.");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events = [...table.querySelectorAll("tr")].slice(1).map(row => {
      const cells = [...row.querySelectorAll("td")].map(cell => cleanWikiText(cell.textContent));
      if (cells.length < 4) return null;
      const parsed = parseEventDate(cells[1]);
      if (!parsed || parsed < today) return null;
      return { event: cells[0], date: cells[1], venue: cells[2], location: cells[3], parsed };
    }).filter(Boolean).sort((a, b) => a.parsed - b.parsed).slice(0, UPCOMING_EVENT_LIMIT);

    events.pulledAt = new Date();
    setCachedUpcomingEvents(events);
    return events;
  }

  function renderEventCards(events, source, pulledAt = new Date()) {
    const list = $("#events-list");
    list.innerHTML = "";
    const pulled = formatPulledAt(pulledAt);
    if (!events.length) {
      list.innerHTML = emptyArtHTML("No upcoming events are available right now. Check UFC.com or try again later.");
      $("#events-source").innerHTML = `${esc(source)} · <a href="https://www.ufc.com/events" target="_blank" rel="noopener">UFC.com backup</a>`;
      return;
    }
    events.forEach(ev => {
      const card = document.createElement("article");
      card.className = "event-card";
      card.innerHTML = `<p class="event-date">${esc(ev.date)}</p>
        <h2>${esc(ev.event)}</h2>
        <p>${esc(ev.venue)}</p>
        <p class="muted">${esc(ev.location)}</p>`;
      list.appendChild(card);
    });
    $("#events-source").innerHTML = `${esc(source)} · schedule last pulled ${esc(pulled)} · <a href="https://en.wikipedia.org/wiki/List_of_UFC_events" target="_blank" rel="noopener">Wikipedia schedule</a> · <a href="https://www.ufc.com/events" target="_blank" rel="noopener">UFC.com backup</a>`;
  }

  async function renderEvents() {
    renderEventCards(EVENT_FALLBACK.slice(0, UPCOMING_EVENT_LIMIT), `Loading live schedule | Event details last pulled ${formatPulledAt()}`);
    try {
      const events = await fetchUpcomingEvents();
      const source = events.length
        ? (events.generated ? "Automated schedule cache; verify against UFC.com" : events.stale ? "Cached schedule; verify against UFC.com" : "Live schedule")
        : "Fallback schedule; verify against UFC.com";
      renderEventCards(
        events.length ? events : EVENT_FALLBACK.slice(0, UPCOMING_EVENT_LIMIT),
        `${source} | Event details last pulled ${formatPulledAt(events.pulledAt || new Date())}`
      );
    } catch {
      const stale = getCachedUpcomingEvents(CFG.EVENTS_CACHE_MINUTES || 30, true);
      renderEventCards(
        stale || EVENT_FALLBACK.slice(0, UPCOMING_EVENT_LIMIT),
        `${stale ? "Cached schedule; verify against UFC.com" : "Fallback schedule; verify against UFC.com"} | Event details last pulled ${formatPulledAt(stale?.pulledAt || new Date())}`
      );
    }
  }

  // ---------- roster ----------
  function divisionLabel(raw) {
    return String(raw || "Featured").replace(/^Women's /, "Women’s ");
  }

  function renderRoster() {
    const body = $("#roster-body");
    const rankingEl = $("#rankings-updated");
    if (rankingEl && window.PKO_GENERATED_CONTENT?.rankingsUpdated) {
      rankingEl.textContent = window.PKO_GENERATED_CONTENT.rankingsUpdated;
    }
    const rows = (window.PKO_allRosterFighters ? window.PKO_allRosterFighters() : []);
    if (!rows.length) {
      body.innerHTML = emptyArtHTML("No roster entries yet.");
      return;
    }

    const groups = new Map();
    rows.forEach(r => {
      const key = divisionLabel(r.division);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });

    body.innerHTML = [...groups.entries()].map(([division, fighters]) => `
      <section class="roster-division">
        <h2>${esc(division)}</h2>
        <div class="roster-table">
          <div class="roster-row roster-head">
            <span>Sprite</span><span>Rank</span><span>Real fighter</span><span>Pixel fighter</span><span>Country</span><span>Persona note</span>
          </div>
          ${fighters.map(f => `<div class="roster-row">
            <span class="roster-sprite"><img src="${esc(f.img || "assets/fighters/placeholder-pixel-fighter.svg")}" alt="${esc(f.pixelName)} placeholder sprite" loading="lazy" /></span>
            <span class="roster-rank">${rankChip(f.ranking)} ${f.ranking ? `<span>${esc(f.ranking.division)}${f.ranking.p4p ? ` · P4P #${esc(f.ranking.p4p)}` : ""}</span>` : `<span>Unranked</span>`}</span>
            <span>${esc(f.name)}</span>
            <span class="pixel-name">${esc(f.pixelName)}</span>
            <span class="country-cell">${flagHTML(f.country || "Parts Unknown", "rect")} ${esc(f.country || "Parts Unknown")}</span>
            <span>${esc(f.pixelTag || "")}</span>
          </div>`).join("")}
        </div>
      </section>
    `).join("") + renderRingCrew();
  }

  function renderRingCrew() {
    const crew = window.PKO_RING_CREW || [];
    if (!crew.length) return "";
    return `<section class="roster-division corner-crew">
      <h2>PKO Corner Crew</h2>
      <p class="muted small">Non-fighter arcade characters use real/public names only as factual references. The pixel art and alternate names are original PKO characters.</p>
      <div class="roster-table corner-crew-table">
        <div class="roster-row roster-head">
          <span>Sprite</span><span>Real / reference name</span><span>PKO alternate name</span><span>Role</span><span>Use note</span>
        </div>
        ${crew.map(c => `<div class="roster-row">
          <span class="roster-sprite"><img src="${esc(c.img)}" alt="${esc(c.pixelName)} pixel presenter" loading="lazy" /></span>
          <span>${esc(c.realName)}</span>
          <span class="pixel-name">${esc(c.pixelName)}</span>
          <span>${esc(c.role)}</span>
          <span>${esc(c.note)}</span>
        </div>`).join("")}
      </div>
    </section>`;
  }

  function renderLegends() {
    const body = $("#legends-body");
    const legends = window.PKO_LEGENDS || [];
    if (!legends.length) {
      body.innerHTML = emptyArtHTML("No legends have been added yet.");
      return;
    }
    body.innerHTML = legends.map(l => `
      <article class="legend-card">
        <div class="legend-top">
          <span class="legend-avatar">${esc((l.pixelName || l.name).slice(0, 1))}</span>
          <div>
            <h2>${esc(l.name)}</h2>
            <p class="pixel-name">${esc(l.pixelName)}</p>
            <p class="small muted">${esc(l.country)} · ${esc(l.divisions)} · ${esc(l.status)}</p>
          </div>
        </div>
        <div class="legend-record">${esc(l.record)}</div>
        <div class="legend-badges">${(l.badges || []).map(b => `<span>${esc(b)}</span>`).join("")}</div>
        ${l.quote ? `<blockquote>${esc(l.quote)}</blockquote>` : ""}
        <ul class="facts">${(l.facts || []).map(f => `<li>${esc(f)}</li>`).join("")}</ul>
        <p class="legend-fun">${esc(l.fun || "")}</p>
      </article>
    `).join("");
  }

  async function renderAdminResultsLegacy() {
    const body = $("#admin-results-body");
    if (!body) return;
    const allowed = await store.isAdmin();
    if (!allowed) {
      body.innerHTML = `${emptyArtHTML("Admin result tools are locked. Sign in with an approved admin email to enter official fight outcomes.")}
        <div class="source-panel">
          <p><strong>How settlement works:</strong> Results are entered manually from official post-fight sources. The Supabase RPC checks the signed-in admin email before it changes points.</p>
          <p class="small muted">Admin email allowlist is stored in Supabase. Do not rely on the public config alone for write access.</p>
        </div>`;
      return;
    }
    let results = {};
    try { results = await store.getBoutResults(EVENT.id); }
    catch (e) {
      body.innerHTML = `<div class="empty-state">Could not load bout results: ${esc(e.message)}</div>`;
      return;
    }
    const settled = Object.keys(results).length;
    body.innerHTML = `<div class="source-panel">
      <p><strong>${esc(EVENT.shortTitle || EVENT.title)}</strong></p>
      <p class="small muted">${settled}/${EVENT.bouts.length} fights have official/manual outcomes. Last viewed ${esc(formatStatusTimestamp())}.</p>
      <p class="small muted">One-way settlement: after a bout is settled, correction requires a manual database repair. Confirm the official result before pressing settle.</p>
      <p class="small muted">Result sources: <a href="https://www.ufc.com/results" target="_blank" rel="noopener">UFC results</a> · <a href="https://en.wikipedia.org/wiki/List_of_UFC_events" target="_blank" rel="noopener">Wikipedia UFC events</a> · <a href="https://www.ufcstats.com/statistics/events/completed" target="_blank" rel="noopener">UFCStats completed events</a></p>
    </div>
    <div class="admin-result-list">
      ${EVENT.bouts.map(b => adminBoutHTML(b, results[b.id])).join("")}
    </div>
    <p id="admin-msg" class="auth-msg"></p>`;

    $$(".admin-settle", body).forEach(btn => {
      btn.onclick = async () => {
        const row = btn.closest(".admin-bout");
        const bout = EVENT.bouts.find(b => b.id === row.dataset.bout);
        const result = $(".admin-result", row).value;
        const winType = $(".admin-win-type", row).value.trim();
        const detail = $(".admin-detail", row).value.trim();
        if (!result) { $("#admin-msg").textContent = "Choose a result first."; return; }
        if ((result === "a" || result === "b") && !winType) {
          $("#admin-msg").textContent = "Choose a win type for completed fights.";
          return;
        }
        btn.disabled = true;
        $("#admin-msg").textContent = `Settling ${bout.weight}...`;
        try {
          const res = await store.adminSettleBout(EVENT.id, bout.id, result, winType, detail);
          const count = res && (res.settled_count ?? res.settledCount ?? 0);
          $("#admin-msg").textContent = `Settled ${bout.weight}. Updated ${count} player picks.`;
          if (result === "a" || result === "b") {
            bout.result = result;
            bout.winType = winType || detail;
          } else {
            bout.result = result === "cancelled" ? "void" : result;
            bout.winType = result;
          }
          await renderAdminResults();
          renderPlay();
          if (!$("#view-leaderboard").classList.contains("hidden")) renderLeaderboard();
        } catch (e) {
          btn.disabled = false;
          $("#admin-msg").textContent = "Settlement failed: " + e.message;
        }
      };
    });
  }

  async function renderAdminResults() {
    const body = $("#admin-results-body");
    if (!body) return;
    const allowed = await store.isAdmin();
    if (!allowed) {
      body.innerHTML = `${emptyArtHTML("Admin tools are locked. Sign in with an approved admin email to manage players, rewards, points, and official fight outcomes.")}
        <div class="source-panel">
          <p><strong>How admin writes work:</strong> Supabase RPCs check the signed-in admin email before changing player state.</p>
          <p class="small muted">Admin email allowlist is stored in Supabase. Do not rely on public config alone for write access.</p>
        </div>`;
      return;
    }

    let results = {}, players = [], trophies = [], audit = [];
    try {
      results = await store.getBoutResults(EVENT.id);
      players = await store.getAdminPlayers(adminQuery);
      if (!adminSelectedUserId && players.length) adminSelectedUserId = players[0].id;
      if (adminSelectedUserId && !players.some(p => p.id === adminSelectedUserId)) {
        const exact = await store.getAdminPlayers(adminSelectedUserId);
        if (exact.length) players = [...exact, ...players.filter(p => p.id !== exact[0].id)];
      }
      if (adminSelectedUserId) trophies = await store.adminGetPlayerTrophies(adminSelectedUserId);
      audit = await store.adminGetAuditLog(30);
    } catch (e) {
      body.innerHTML = `<div class="empty-state">Could not load admin tools: ${esc(e.message)}</div>`;
      return;
    }

    const selected = players.find(p => p.id === adminSelectedUserId) || null;
    const settled = Object.keys(results).length;
    body.innerHTML = `<div class="source-panel">
      <p><strong>${esc(EVENT.shortTitle || EVENT.title)}</strong></p>
      <p class="small muted">${settled}/${EVENT.bouts.length} fights have official/manual outcomes. Last viewed ${esc(formatStatusTimestamp())}.</p>
      <p class="small muted">Admin writes go through server RPCs and are recorded in the audit log. Use a clear reason for every moderation, point, and reward change. <a href="#ops" data-route="ops">Open operator notes</a>.</p>
    </div>
    <section class="admin-section">
      <div class="section-head"><div><p class="kicker">PLAYER ADMIN</p><h2>Profiles, points, rewards</h2></div></div>
      <div class="admin-player-tools">
        <div>
          <div class="admin-search-row">
            <input id="admin-player-query" class="input" value="${esc(adminQuery)}" placeholder="Search name, email, or user id" />
            <button id="admin-player-search" class="btn btn-ghost">Search</button>
          </div>
          <div class="admin-player-list">
            ${players.length ? players.map(p => adminPlayerRowHTML(p, p.id === adminSelectedUserId)).join("") : emptyArtHTML("No matching players.")}
          </div>
        </div>
        <div id="admin-selected-player">
          ${selected ? adminSelectedPlayerHTML(selected, trophies) : emptyArtHTML("Select a player to manage.")}
        </div>
      </div>
      <p id="admin-player-msg" class="auth-msg"></p>
    </section>
    <section class="admin-section">
      <div class="section-head"><div><p class="kicker">RESULT OPERATIONS</p><h2>Manual settlement</h2></div></div>
      <p class="small muted">One-way settlement: after a bout is settled, correction requires a manual repair. Confirm the official result first.</p>
      <p class="small muted">Result sources: <a href="https://www.ufc.com/results" target="_blank" rel="noopener">UFC results</a> | <a href="https://en.wikipedia.org/wiki/List_of_UFC_events" target="_blank" rel="noopener">Wikipedia UFC events</a> | <a href="https://www.ufcstats.com/statistics/events/completed" target="_blank" rel="noopener">UFCStats completed events</a></p>
      <div class="admin-result-list">
        ${EVENT.bouts.map(b => adminBoutHTML(b, results[b.id])).join("")}
      </div>
      <p id="admin-msg" class="auth-msg"></p>
    </section>
    <section class="admin-section">
      <div class="section-head"><div><p class="kicker">AUDIT LOG</p><h2>Recent admin changes</h2></div></div>
      <div class="admin-audit-list">${adminAuditHTML(audit)}</div>
    </section>`;

    bindAdminPlayerTools(body);
    bindAdminSettlementTools(body);
  }

  function adminPlayerRowHTML(p, selected) {
    return `<button class="admin-player-row ${selected ? "selected" : ""}" data-user="${esc(p.id)}">
      <strong>${esc(p.name || "Fighter")}</strong>
      <span>${esc(p.email || p.id)}</span>
      <em>${Number(p.points || 0)} pts${p.nameChosen ? "" : " | name reset"}</em>
    </button>`;
  }

  function adminSelectedPlayerHTML(p, trophies) {
    return `<div class="admin-player-card">
      <p class="kicker">SELECTED PLAYER</p>
      <h2>${esc(p.name || "Fighter")}</h2>
      <p class="muted small">${esc(p.email || p.id)}</p>
      <p class="muted small">${Number(p.points || 0)} Glory Points</p>
      <div class="admin-form-grid">
        <label>Display name<input id="admin-name-input" class="input" value="${esc(p.name || "")}" maxlength="18" /></label>
        <label class="admin-check"><input id="admin-name-chosen" type="checkbox" ${p.nameChosen ? "checked" : ""} /> Name is chosen</label>
        <label class="wide">Reason<input id="admin-name-reason" class="input" placeholder="Why this name change is needed" /></label>
        <button id="admin-save-name" class="btn btn-primary wide">Save name</button>
      </div>
      <div class="admin-form-grid">
        <label>Point delta<input id="admin-point-amount" class="input" type="number" step="1" placeholder="e.g. 250 or -100" /></label>
        <label>Ledger label<input id="admin-point-label" class="input" value="Admin point adjustment" /></label>
        <label class="wide">Reason<input id="admin-point-reason" class="input" placeholder="Bug fix, correction, or moderation reason" /></label>
        <button id="admin-adjust-points" class="btn btn-primary wide">Adjust points</button>
      </div>
      <div class="admin-form-grid">
        <label>Kind<select id="admin-trophy-kind" class="input">
          <option value="award">Award</option><option value="badge">Badge</option><option value="belt">Belt</option><option value="penalty">Penalty</option><option value="event">Event</option>
        </select></label>
        <label>Icon/text<input id="admin-trophy-icon" class="input" value="PKO" maxlength="16" /></label>
        <label class="wide">Title<input id="admin-trophy-title" class="input" placeholder="Red Tomato Award" /></label>
        <label class="wide">Subtitle<input id="admin-trophy-sub" class="input" placeholder="Cosmetic manual award" /></label>
        <label>Event id<input id="admin-trophy-event" class="input" placeholder="${esc(EVENT.id)}" /></label>
        <label>Event title<input id="admin-trophy-event-title" class="input" placeholder="${esc(EVENT.shortTitle)}" /></label>
        <label class="wide">Reason<input id="admin-trophy-reason" class="input" placeholder="Why this reward is being granted" /></label>
        <button id="admin-tomato-fill" class="btn btn-ghost">Fill Red Tomato</button>
        <button id="admin-grant-trophy" class="btn btn-primary">Grant reward</button>
      </div>
      <h3>Rewards</h3>
      <div class="admin-trophy-list">
        ${trophies.length ? trophies.map(t => `<div class="admin-trophy-row">
          <span>${rewardArtHTML(t, "admin-reward-art")}</span><strong>${esc(t.title || "Reward")}</strong><em>${esc(t.kind || "award")}</em>
          <button class="btn btn-ghost admin-revoke-trophy" data-trophy="${esc(t.id)}">Revoke</button>
        </div>`).join("") : emptyArtHTML("No manual rewards yet.")}
      </div>
    </div>`;
  }

  function adminAuditHTML(rows) {
    if (!rows.length) return emptyArtHTML("No admin changes recorded yet.");
    return rows.map(r => {
      const when = r.createdAt ? new Date(r.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "";
      return `<article class="admin-audit-row">
        <div><strong>${esc(r.action)}</strong><span>${esc(when)} | ${esc(r.adminEmail || "admin")}</span></div>
        <p>${esc(r.reason || "")}</p>
        <code>${esc(r.targetUserId || "no player target")}</code>
      </article>`;
    }).join("");
  }

  function bindAdminPlayerTools(root) {
    const msg = $("#admin-player-msg");
    const setMsg = text => { if (msg) msg.textContent = text; };
    $("#admin-player-search").onclick = () => {
      adminQuery = $("#admin-player-query").value.trim();
      adminSelectedUserId = null;
      renderAdminResults();
    };
    $("#admin-player-query").addEventListener("keydown", e => {
      if (e.key === "Enter") $("#admin-player-search").click();
    });
    $$(".admin-player-row", root).forEach(btn => {
      btn.onclick = () => { adminSelectedUserId = btn.dataset.user; renderAdminResults(); };
    });
    const selectedId = adminSelectedUserId;
    if (!selectedId) return;

    $("#admin-save-name").onclick = async () => {
      try {
        await store.adminUpdatePlayerName(selectedId, $("#admin-name-input").value,
          $("#admin-name-chosen").checked, $("#admin-name-reason").value.trim());
        await renderAdminResults();
      } catch (e) { setMsg("Name update failed: " + e.message); }
    };
    $("#admin-adjust-points").onclick = async () => {
      try {
        await store.adminAdjustPoints(selectedId, $("#admin-point-amount").value,
          $("#admin-point-label").value.trim(), $("#admin-point-reason").value.trim());
        await renderAdminResults();
      } catch (e) { setMsg("Point adjustment failed: " + e.message); }
    };
    $("#admin-tomato-fill").onclick = () => {
      $("#admin-trophy-kind").value = "award";
      $("#admin-trophy-icon").value = "TOM";
      $("#admin-trophy-title").value = "Red Tomato Award";
      $("#admin-trophy-sub").value = "Manual cosmetic award for peak tomato-energy takes.";
      $("#admin-trophy-event").value = EVENT.id;
      $("#admin-trophy-event-title").value = EVENT.shortTitle || EVENT.title;
      if (!$("#admin-trophy-reason").value.trim()) $("#admin-trophy-reason").value = "Manual comedy award.";
    };
    $("#admin-grant-trophy").onclick = async () => {
      try {
        await store.adminGrantTrophy(selectedId, {
          kind: $("#admin-trophy-kind").value,
          icon: $("#admin-trophy-icon").value.trim(),
          title: $("#admin-trophy-title").value.trim(),
          sub: $("#admin-trophy-sub").value.trim(),
          eventId: $("#admin-trophy-event").value.trim(),
          eventTitle: $("#admin-trophy-event-title").value.trim(),
        }, $("#admin-trophy-reason").value.trim());
        await renderAdminResults();
      } catch (e) { setMsg("Reward grant failed: " + e.message); }
    };
    $$(".admin-revoke-trophy", root).forEach(btn => {
      btn.onclick = async () => {
        const reason = window.prompt("Reason for revoking this reward?");
        if (!reason) return;
        try {
          await store.adminRevokeTrophy(btn.dataset.trophy, reason);
          await renderAdminResults();
        } catch (e) { setMsg("Reward revoke failed: " + e.message); }
      };
    });
  }

  function bindAdminSettlementTools(body) {
    $$(".admin-settle", body).forEach(btn => {
      btn.onclick = async () => {
        const row = btn.closest(".admin-bout");
        const bout = EVENT.bouts.find(b => b.id === row.dataset.bout);
        const result = $(".admin-result", row).value;
        const winType = $(".admin-win-type", row).value.trim();
        const detail = $(".admin-detail", row).value.trim();
        if (!result) { $("#admin-msg").textContent = "Choose a result first."; return; }
        if ((result === "a" || result === "b") && !winType) {
          $("#admin-msg").textContent = "Choose a win type for completed fights.";
          return;
        }
        btn.disabled = true;
        $("#admin-msg").textContent = `Settling ${bout.weight}...`;
        try {
          const res = await store.adminSettleBout(EVENT.id, bout.id, result, winType, detail);
          const count = res && (res.settled_count ?? res.settledCount ?? 0);
          $("#admin-msg").textContent = `Settled ${bout.weight}. Updated ${count} player picks.`;
          if (result === "a" || result === "b") {
            bout.result = result;
            bout.winType = winType || detail;
          } else {
            bout.result = result === "cancelled" ? "void" : result;
            bout.winType = result;
          }
          await renderAdminResults();
          renderPlay();
          if (!$("#view-leaderboard").classList.contains("hidden")) renderLeaderboard();
        } catch (e) {
          btn.disabled = false;
          $("#admin-msg").textContent = "Settlement failed: " + e.message;
        }
      };
    });
  }

  function adminBoutHTML(b, result) {
    const settled = !!result;
    const label = result ? adminResultLabel(b, result) : "Awaiting official result";
    return `<article class="admin-bout" data-bout="${esc(b.id)}">
      <div>
        <p class="kicker">${esc(b.weight)}</p>
        <h2>${esc(b.a.real)} vs ${esc(b.b.real)}</h2>
        <p class="muted small">${esc(label)}</p>
      </div>
      <div class="admin-controls">
        <select class="input admin-result" ${settled ? "disabled" : ""}>
          <option value="">Result</option>
          <option value="a">${esc(b.a.real)} wins</option>
          <option value="b">${esc(b.b.real)} wins</option>
          <option value="draw">Draw - refund</option>
          <option value="void">Fight cancelled - refund</option>
          <option value="cancelled">No contest/cancelled - refund</option>
        </select>
        <select class="input admin-win-type" ${settled ? "disabled" : ""}>
          <option value="">Win type</option>
          <option>TKO</option>
          <option>Split decision</option>
          <option>Decision</option>
          <option>Unanimous decision</option>
          <option>Submission</option>
          <option>Draw</option>
          <option>Disqualified</option>
          <option>Fight cancelled</option>
        </select>
        <input class="input admin-detail" placeholder="Method detail, round, or source note" ${settled ? "disabled" : ""} />
        <button class="btn btn-primary admin-settle" ${settled ? "disabled" : ""}>${settled ? "Settled" : "Settle fight"}</button>
      </div>
    </article>`;
  }

  function adminResultLabel(b, r) {
    if (r.result === "a" || r.result === "b") {
      const who = b[r.result]?.real || b[r.result]?.name || "Winner";
      return `${who} won${r.winType ? " by " + r.winType : ""}${r.methodDetail ? " - " + r.methodDetail : ""}`;
    }
    if (r.result === "draw") return "Draw - committed points refunded";
    return "Fight cancelled/void - committed points refunded";
  }

  // ---------- profile ----------
  async function renderProfile() {
    const body = $("#profile-body");
    if (!store.user || !store.user.nameChosen) {
      body.innerHTML = `<h1>Profile</h1>${emptyArtHTML("Sign in to claim your fighter name, track Glory Points, view point history, and build a shrine of virtual badges and belts.")}
        <button class="btn btn-primary" id="p-signin">Sign in</button>`;
      $("#p-signin").onclick = openAuth; return;
    }
    const pts = await store.getPoints();
    const rows = await store.getLeaderboard();
    const rank = rows.findIndex(r => r.me) + 1;
    const shrineItems = await store.getShrineItems();
    const history = await store.getPointHistory(30);
    const shelf = renderShrineItems(shrineItems);
    const showcaseItem = { icon: store.user.showcaseIcon, title: store.user.showcaseTitle };
    const showcase = store.user.showcaseIcon
      ? `<div class="showcase-big" title="${esc(store.user.showcaseTitle || "Showcase item")}">${rewardArtHTML(showcaseItem, "showcase-art")}</div>`
      : `<div class="showcase-big empty">?</div>`;
    body.innerHTML = `
      <div class="profile-head">
        <div class="avatar big" style="background:var(--panel2)">👤</div>${showcase}
        <div><h1>${esc(store.user.name)}</h1>
          <p class="muted">Season ${CFG.CURRENT_SEASON} · Rank ${rank > 0 ? "#" + rank : "—"}</p></div>
        <div class="bank"><span class="bank-label">GLORY POINTS</span>
          <span class="bank-value">${pts}</span><span class="bank-note">resets Jan 1</span></div>
      </div>
      <h2 style="margin-top:24px">Shrine <span class="small muted">(virtual · zero value · cannot be bought or sold)</span></h2>
      <div class="shelf">${shelf}</div>
      <h2 style="margin-top:24px">Point History</h2>
      <div class="point-history">${renderPointHistory(history)}</div>
      <div style="margin-top:18px"><button class="btn btn-primary" id="prof-share">📣 Share my result</button></div>`;
    $$(".trophy-select", body).forEach(btn => {
      btn.onclick = async () => {
        try {
          await store.setShowcaseItem(btn.dataset.item);
          renderAccount();
          renderProfile();
        } catch (e) {
          $("#play-msg").textContent = "⚠ " + e.message;
        }
      };
    });
    $("#prof-share").onclick = () => window.PKO.openShare();
    const newsletter = document.createElement("div");
    newsletter.id = "profile-newsletter";
    body.appendChild(newsletter);
    renderNewsletterSignup(newsletter);
  }

  function renderShrineItems(items) {
    if (!items.length) return emptyArtHTML("No shrine items yet. Play a card to earn participation badges, event-placement badges, and virtual belts.");
    return items.map(t => {
      const picked = store.user && store.user.showcaseItemId === t.id;
      return `<div class="trophy ${esc(t.kind)} ${picked ? "selected" : ""}">
        <div class="trophy-ico">${rewardArtHTML(t, "trophy-art")}</div>
        <div class="trophy-title">${esc(t.title)}</div>
        <div class="trophy-sub">${esc(t.sub || "")}</div>
        <div class="trophy-season">Season ${esc(t.season || CFG.CURRENT_SEASON)}</div>
        <button class="btn btn-ghost trophy-select" data-item="${esc(t.id)}">${picked ? "Displayed" : "Display"}</button>
      </div>`;
    }).join("");
  }

  function renderPointHistory(history) {
    if (!history.length) return emptyArtHTML("No point history yet. Signup grants, event grants, prediction stakes, refunds, wins, and live bonuses will appear here.");
    return history.map(h => {
      const amount = Number(h.amount) || 0;
      const sign = amount > 0 ? "+" : "";
      const cls = amount > 0 ? "gain" : amount < 0 ? "loss" : "neutral";
      const when = h.createdAt ? new Date(h.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "";
      return `<div class="history-row">
        <span class="history-main"><strong>${esc(h.label || h.type || "Point update")}</strong><span>${esc(when)}</span></span>
        <span class="history-amount ${cls}">${sign}${amount}</span>
        <span class="history-balance">${Number(h.balance || 0)} pts</span>
      </div>`;
    }).join("");
  }

  function renderNewsletterSignup(target, opts = {}) {
    if (!target) return;
    const formUrl = CFG.BREVO_FORM_URL;
    if (!formUrl) { target.innerHTML = ""; return; }
    const hours = CFG.MAJOR_EVENT_EMAIL_HOURS_BEFORE || 5;
    const compact = opts.compact ? " compact" : "";
    target.innerHTML = `
      <section class="newsletter-panel${compact}">
        <div>
          <p class="kicker">MAJOR EVENT ALERTS</p>
          <h2>Get the big-card reminder</h2>
          <p>Sign up for major-event emails only. PKO sends the reminder about ${hours} hours before a major card so you can lock picks before the first bell.</p>
          <form class="newsletter-form" method="POST" action="${esc(formUrl)}" data-type="subscription" novalidate>
            <div class="newsletter-fields">
              <label class="sr-only">Email address</label>
              <input class="newsletter-email" type="email" name="EMAIL" autocomplete="email" placeholder="you@example.com" required />
              <button class="btn btn-primary" type="submit">Sign up for alerts</button>
            </div>
            <label class="newsletter-consent">
              <input type="checkbox" name="GDPR_CONSENT" value="1" required />
              <span>I agree to receive major-event emails and accept the <a href="privacy.html">privacy policy</a>. Unsubscribe anytime.</span>
            </label>
            <label class="newsletter-error"></label>
            <p class="newsletter-success">You're almost in. Check your inbox to confirm your spot on the roster.</p>
            <input type="text" name="email_address_check" value="" class="input--hidden" tabindex="-1" autocomplete="off" />
            <input type="hidden" name="locale" value="en" />
          </form>
          <p class="small muted">No point purchases, no paid picks, no spam.</p>
        </div>
        <div class="newsletter-qr">
          <img src="assets/pixelknockout_signup_QR-Code.png" alt="QR code for Pixel Knockout major event email signup" loading="lazy" />
          <span class="small muted">Scan to join</span>
        </div>
      </section>`;
    bindNewsletterForms(target);
  }

  function bindNewsletterForms(root = document) {
    $$(".newsletter-form", root).forEach(form => {
      if (form.dataset.bound) return;
      form.dataset.bound = "true";
      const email = $(".newsletter-email", form);
      const consent = $("input[name='GDPR_CONSENT']", form);
      const error = $(".newsletter-error", form);
      const success = $(".newsletter-success", form);
      const button = $("button[type='submit']", form);
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const setError = msg => {
        if (!error) return;
        error.textContent = msg || "";
        error.style.display = msg ? "block" : "none";
      };
      const setSuccess = on => { if (success) success.style.display = on ? "block" : "none"; };
      form.addEventListener("submit", ev => {
        ev.preventDefault();
        setError(""); setSuccess(false);
        const val = (email && email.value || "").trim();
        if (!val) { setError("Enter your email address first."); email && email.focus(); return; }
        if (!emailRe.test(val)) { setError("That email format looks wrong. Check it and try again."); email && email.focus(); return; }
        if (!consent || !consent.checked) { setError("Tick the consent box to join the major-event alerts."); consent && consent.focus(); return; }

        const data = new FormData(form);
        const xhr = new XMLHttpRequest();
        if (button) { button.disabled = true; button.textContent = "Sending..."; }
        xhr.addEventListener("load", () => {
          let res = null; try { res = JSON.parse(xhr.response); } catch {}
          if (xhr.status >= 200 && xhr.status < 300 && !(res && res.errors)) {
            form.reset();
            setSuccess(true);
          } else {
            setError((res && (res.message || res.errors)) || "Signup did not go through. Try again in a moment.");
          }
          if (button) { button.disabled = false; button.textContent = "Sign up for alerts"; }
        });
        xhr.addEventListener("error", () => {
          setError("Network error reaching Brevo. Try again in a moment.");
          if (button) { button.disabled = false; button.textContent = "Sign up for alerts"; }
        });
        xhr.open("POST", form.getAttribute("action") + "?isAjax=1");
        xhr.send(data);
      });
    });
  }

  // ---------- username modal ----------
  function openNameModal() {
    $("#name-modal").classList.remove("hidden");
    $("#name-input").value = "";
    setTimeout(() => $("#name-input").focus(), 50);
  }
  function closeNameModal() { $("#name-modal").classList.add("hidden"); $("#name-msg").textContent = ""; }
  $("#btn-savename").onclick = saveName;
  $("#name-input").addEventListener("keydown", e => { if (e.key === "Enter") saveName(); });
  async function saveName() {
    try { await store.setUsername($("#name-input").value);
      closeNameModal(); $("#play-msg").textContent = `Welcome, ${store.user.name}! +${CFG.POINTS_SIGNUP} signup Glory Points granted.`;
    } catch (e) { $("#name-msg").textContent = "⚠ " + e.message; }
  }

  // ---------- auth modal ----------
  function openAuth() {
    $("#auth-modal").classList.remove("hidden");
    $("#auth-mode-note").textContent = store.mode === "local"
      ? "Dev mode: no Supabase configured — sign-in is simulated locally."
      : "Secured by Supabase Auth.";
  }
  function closeAuth() { $("#auth-modal").classList.add("hidden"); $("#auth-msg").textContent = ""; }
  $("#auth-close").onclick = closeAuth;
  $("#auth-modal").addEventListener("click", e => { if (e.target.id === "auth-modal") closeAuth(); });
  $("#btn-google").onclick = async () => {
    try { await store.signInGoogle(); if (store.mode === "local") closeAuth(); }
    catch (e) { $("#auth-msg").textContent = "⚠ " + e.message; }
  };
  $("#btn-email").onclick = async () => {
    try { const r = await store.signInEmail($("#email-input").value.trim());
      if (r && r.instant) closeAuth(); else $("#auth-msg").textContent = "✉ Magic link sent — check your email.";
    } catch (e) { $("#auth-msg").textContent = "⚠ " + e.message; }
  };

  // ---------- share card ----------
  const SITE = "pixelknockout.com";
  const imageCache = new Map();
  function loadCanvasImage(src) {
    if (!src) return Promise.resolve(null);
    if (imageCache.has(src)) return imageCache.get(src);
    const promise = new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
    imageCache.set(src, promise);
    return promise;
  }
  async function buildShareData() {
    const rec = await store.getEventRecord(EVENT.id);
    const rows = await store.getLeaderboard();
    const rank = rows.findIndex(r => r.me) + 1;
    const pts = await store.getPoints();
    return { rec, rank, pts, name: store.user ? store.user.name : "Fighter" };
  }

  async function drawShareCard(d) {
    const c = $("#share-canvas"), x = c.getContext("2d");
    const W = c.width, H = c.height;
    const bg = await loadCanvasImage(UI_ART.shareBg);
    if (bg) x.drawImage(bg, 0, 0, W, H);
    else {
      const g = x.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, "#1d1745"); g.addColorStop(1, "#0d0b1f");
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.strokeStyle = "#ffd34d"; x.lineWidth = 6; x.strokeRect(8, 8, W - 16, H - 16);
    }
    x.textAlign = "left";
    // logo
    x.fillStyle = "#ffd34d"; x.font = "32px 'Press Start 2P', monospace";
    x.fillText("PKO", 34, 60);
    x.fillStyle = "#9a93c9"; x.font = "12px 'Press Start 2P', monospace";
    x.fillText("PIXEL KNOCKOUT", 120, 56);
    // record line
    const ratio = d.rec.total ? `${d.rec.hits}/${d.rec.total}` : "—";
    x.fillStyle = "#f5f3ff"; x.font = "20px 'Press Start 2P', monospace";
    x.fillText(`I went ${ratio}`, 34, 130);
    x.fillStyle = "#4dffa3"; x.font = "16px 'Press Start 2P', monospace";
    x.fillText(`at ${EVENT.shortTitle}`, 34, 168);
    // rank + points
    x.fillStyle = "#ff4d6d"; x.font = "16px 'Press Start 2P', monospace";
    x.fillText(`${d.name}`, 34, 214);
    x.fillStyle = "#ffd34d"; x.font = "14px 'Press Start 2P', monospace";
    x.fillText(`RANK #${d.rank > 0 ? d.rank : "?"}  ·  ${d.pts} GLORY PTS`, 34, 248);
    // belt
    const belt = store.BELTS[d.rank];
    const beltImg = await loadCanvasImage(belt && belt.asset);
    if (beltImg) x.drawImage(beltImg, W - 132, 96, 92, 92);
    else {
      x.font = "40px serif"; x.textAlign = "right";
      x.fillText(belt ? belt.icon : "🥊", W - 40, 150);
    }
    x.textAlign = "right";
    if (belt) { x.fillStyle = "#ffd34d"; x.font = "10px 'Press Start 2P', monospace";
      x.fillText(belt.title, W - 40, 180); }
    // footer
    x.textAlign = "left"; x.fillStyle = "#9a93c9"; x.font = "13px 'Press Start 2P', monospace";
    x.fillText(SITE, 34, H - 30);
    x.fillStyle = "#4dc3ff"; x.font = "10px 'Press Start 2P', monospace";
    x.fillText("free game · just internet points", 34, H - 14);
  }

  async function openShare() {
    const d = await buildShareData();
    const ratio = d.rec.total ? `${d.rec.hits}/${d.rec.total}` : "no";
    const beltTxt = store.BELTS[d.rank] ? ` and grabbed the ${store.BELTS[d.rank].icon} ${store.BELTS[d.rank].title} belt` : "";
    $("#share-text").value =
      `I went ${ratio} predictions at ${EVENT.shortTitle} on PKO — ranked #${d.rank > 0 ? d.rank : "?"} with ${d.pts} Glory Points${beltTxt}. 🥊\nFree game, just internet points — ${SITE}`;
    $("#share-modal").classList.remove("hidden");
    // fonts may need a tick to be ready for canvas
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch {} }
    await drawShareCard(d);
    $("#share-msg").textContent = "";
  }
  function closeShare() { $("#share-modal").classList.add("hidden"); }
  $("#share-close").onclick = closeShare;
  $("#share-modal").addEventListener("click", e => { if (e.target.id === "share-modal") closeShare(); });
  $("#share-copy").onclick = async () => {
    try { await navigator.clipboard.writeText($("#share-text").value); $("#share-msg").textContent = "✅ Copied!"; }
    catch { $("#share-text").select(); $("#share-msg").textContent = "Select + copy the text above."; }
  };
  $("#share-download").onclick = () => {
    const a = document.createElement("a");
    a.download = `pko-${EVENT.id}.png`;
    a.href = $("#share-canvas").toDataURL("image/png");
    a.click();
  };
  window.PKO.openShare = openShare;

  // fighter modal close
  $("#fighter-close").onclick = () => $("#fighter-modal").classList.add("hidden");
  $("#fighter-modal").addEventListener("click", e => { if (e.target.id === "fighter-modal") $("#fighter-modal").classList.add("hidden"); });

  if (CFG.STRIPE_DONATE_URL && !CFG.STRIPE_DONATE_URL.includes("REPLACE_ME")) {
    $("#donate-link").href = CFG.STRIPE_DONATE_URL;
  } else {
    $("#donate-link").removeAttribute("href");
    $("#donate-link").setAttribute("aria-disabled", "true");
    $("#donate-link").textContent = "💚 Donations coming soon";
  }

  // react to auth changes
  window.addEventListener("pko-auth", async () => {
    renderAccount();
    if (store.needsUsername()) { openNameModal(); return; }
    route((window.location.hash || "#play").slice(1), { skipHash: true });
  });

  // ---------- boot ----------
  (async function boot() {
    await store.init();
    renderAccount();
    if (store.needsUsername()) openNameModal();
    route((window.location.hash || "#play").slice(1), { skipHash: true });
    renderCountdown();
    setInterval(renderCountdown, 30000);
    setInterval(() => { if (!$("#view-play").classList.contains("hidden")) renderPlay(); }, 60000);
  })();
})();
