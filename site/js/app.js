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

  let draft = {}; // boutId -> {pick, stake}

  // predictions lock at the card's start time (when real odds close)
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
    const jokes = (f.jokes || []).map(x => `<li>${esc(x)}</li>`).join("");
    $("#fighter-body").innerHTML = `
      <div class="profile-head">
        ${avatarHTML(f, "big")}
        <div><h1>${esc(f.name)}</h1>
          <p class="muted">as ${esc(f.real)} · <span class="flag" title="${esc(f.country || "Parts Unknown")}">${f.flag || "🏴"}</span> ${esc(f.country || "Parts Unknown")}</p>
          <p class="fighter-tag">${esc(f.tag)}</p></div>
      </div>
      <h2 style="margin-top:18px">📋 Real facts</h2>
      <ul class="facts">${facts}</ul>
      <h2>😂 Fun facts <span class="small muted">(parody — totally made up)</span></h2>
      <ul class="facts fun">${jokes}</ul>`;
    $("#fighter-modal").classList.remove("hidden");
  }
  window.PKO.openFighterProfile = openFighterProfile;

  // ---------- routing ----------
  function route(name) {
    $$(".view").forEach(v => v.classList.add("hidden"));
    const view = $("#view-" + name);
    if (view) view.classList.remove("hidden");
    $$(".nav-link[data-route]").forEach(l => l.classList.toggle("active", l.dataset.route === name));
    if (name === "leaderboard") renderLeaderboard();
    if (name === "events") renderEvents();
    if (name === "play") renderPlay();
    if (name === "profile") renderProfile();
  }
  $$(".nav-link[data-route]").forEach(l => l.addEventListener("click", e => { e.preventDefault(); route(l.dataset.route); }));

  // ---------- account box ----------
  function renderAccount() {
    const box = $("#account-box");
    if (store.user && store.user.nameChosen) {
      box.innerHTML = `<a class="acct-name" href="#profile" id="acct-link">👤 ${esc(store.user.name)}</a>
        <button class="btn btn-ghost" id="btn-signout">Sign out</button>`;
      $("#acct-link").onclick = e => { e.preventDefault(); route("profile"); };
      $("#btn-signout").onclick = async () => { await store.signOut(); };
    } else {
      box.innerHTML = `<button class="btn btn-primary" id="btn-signin">Sign in</button>`;
      $("#btn-signin").onclick = openAuth;
    }
  }

  // ---------- play view ----------
  async function renderPlay() {
    $("#event-title").textContent = EVENT.title;
    $("#event-date").textContent = EVENT.date + " · Season " + EVENT.season;
    $("#event-real").textContent = EVENT.realTitle +
      (EVENT.oddsSource === "live" ? " · live odds" : " · demo odds (set an odds key for live)");

    const signed = store.user && store.user.nameChosen;
    const pts = signed ? await store.getPoints() : CFG.POINTS_SIGNUP;
    $("#bank-value").textContent = pts;
    $("#bank-note").textContent = signed ? "+10/day · +1000/event" : "(sign in to save)";
    await renderBonusPanel(signed);

    const existing = signed ? await store.getPredictions(EVENT.id) : {};
    const timeLocked = cardLocked();
    const hasPicks = Object.keys(existing).length > 0;
    const locked = hasPicks || timeLocked;

    const wrap = $("#bouts"); wrap.innerHTML = "";
    EVENT.bouts.forEach(b => wrap.appendChild(renderBout(b, existing[b.id], locked)));

    const submit = $("#submit-picks");
    submit.textContent = (timeLocked && !hasPicks) ? "PREDICTIONS CLOSED"
      : (hasPicks ? "PREDICTIONS LOCKED" : "LOCK IN PREDICTIONS");
    submit.disabled = locked; submit.style.opacity = locked ? .6 : 1;
    if (timeLocked && !hasPicks && !$("#play-msg").textContent)
      $("#play-msg").textContent = "⏰ Predictions are closed — the card has started.";

    // dev: resolve fights one at a time so leaderboard moves after each fight.
    // The "void" button simulates a real fight being scratched (stake refunded).
    ["#dev-settle", "#dev-void"].forEach(id => { const e = $(id); if (e) e.remove(); });
    const anyOpen = locked && Object.values(existing).some(p => !p.settled);
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

  function renderBout(b, pred, locked) {
    const el = document.createElement("div");
    el.className = "bout";
    el.innerHTML = `<div class="bout-weight">${b.weight}</div>
      <div class="matchup">${fighterCard(b.a, "a", b.oddsA, pred, locked)}
        <div class="vs">VS</div>
        ${fighterCard(b.b, "b", b.oddsB, pred, locked)}</div>`;

    if (!locked) {
      const stake = (draft[b.id] && draft[b.id].stake) || 100;
      const row = document.createElement("div");
      row.className = "stake-row";
      row.innerHTML = `<span class="small muted">Points:</span>
        <input type="range" min="0" max="2000" step="10" value="${stake}" />
        <span class="stake-val">${stake} pts</span>`;
      const slider = row.querySelector("input"), val = row.querySelector(".stake-val");
      slider.oninput = () => { val.textContent = slider.value + " pts";
        draft[b.id] = Object.assign({ pick: null }, draft[b.id], { stake: +slider.value }); };
      el.appendChild(row);
      $$(".fighter", el).forEach(f => f.onclick = () => {
        $$(".fighter", el).forEach(x => x.classList.remove("picked"));
        f.classList.add("picked");
        draft[b.id] = Object.assign({ stake: 100 }, draft[b.id], { pick: f.dataset.side });
      });
    } else if (pred) {
      const who = b[pred.pick].name;
      const r = document.createElement("div"); r.className = "bout-result";
      if (pred.voided) { r.className += " void";
        r.innerHTML = `⚖️ Bout cancelled — <strong>${pred.stake} pts refunded</strong> (no win/loss)`; }
      else if (pred.settled) r.innerHTML = pred.won > 0
        ? `✅ <span style="color:var(--green)">${esc(who)}</span> won — +${pred.won} pts`
        : `❌ ${esc(who)} lost — ${pred.stake} pts gone`;
      else r.innerHTML = `🔒 Predicted <strong>${esc(who)}</strong> · ${pred.stake} pts · pays ${pred.multiplier.toFixed(2)}x`;
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
      <div class="fighter-name"><span class="flag" title="${esc(f.country || "Parts Unknown")}">${f.flag || "🏴"}</span> ${esc(f.name)}</div>
      <div class="fighter-real">as ${esc(f.real)}</div>
      <div class="fighter-tag">${esc(f.tag)}</div>
      <div class="fighter-odds">odds ${oddsStr}</div>
      <div class="fighter-mult">pays ${m}x</div>
    </div>`;
  }

  $("#submit-picks").onclick = async () => {
    if (!store.user || !store.user.nameChosen) { openAuth(); return; }
    const picks = [];
    for (const b of EVENT.bouts) {
      const d = draft[b.id];
      if (d && d.pick && d.stake > 0) {
        const odds = d.pick === "a" ? b.oddsA : b.oddsB;
        picks.push({ boutId: b.id, pick: d.pick, stake: d.stake, multiplier: +mult(odds).toFixed(4) });
      }
    }
    if (!picks.length) { $("#play-msg").textContent = "Pick at least one winner and set points."; return; }
    try { await store.submitPicks(EVENT.id, picks);
      $("#play-msg").textContent = "Locked in! Odds are frozen on your picks. Good luck 🥊";
      draft = {}; renderPlay();
    } catch (e) { $("#play-msg").textContent = "⚠ " + e.message; }
  };

  // ---------- leaderboard ----------
  async function renderLeaderboard() {
    $("#season-year").textContent = CFG.CURRENT_SEASON;
    const rows = await store.getLeaderboard();
    const list = $("#leaderboard-list"); list.innerHTML = "";
    rows.slice(0, 100).forEach((r, i) => {
      const rank = i + 1, belt = store.BELTS[rank];
      const li = document.createElement("li");
      li.className = "lb-row" + (r.me ? " me" : "") + (rank <= 5 ? " top5" : "");
      li.innerHTML = `<span class="lb-rank">#${rank}</span>
        <span class="lb-belt">${belt ? belt.icon : ""}</span>
        <span class="lb-name">${esc(r.name)}${belt ? `<span class="lb-title">${belt.title}</span>` : ""}</span>
        <span class="lb-pts">${r.points} pts</span>`;
      list.appendChild(li);
    });
  }

  // ---------- future events ----------
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

  async function fetchUpcomingEvents() {
    const url = "https://en.wikipedia.org/w/api.php?action=parse&page=List_of_UFC_events&prop=text&format=json&origin=*";
    const data = await (await fetch(url)).json();
    const html = data && data.parse && data.parse.text && data.parse.text["*"];
    if (!html) throw new Error("Wikipedia response did not include page HTML.");

    const doc = new DOMParser().parseFromString(html, "text/html");
    const table = findScheduledEventsTable(doc);
    if (!table) throw new Error("Scheduled events table was not found.");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return [...table.querySelectorAll("tr")].slice(1).map(row => {
      const cells = [...row.querySelectorAll("td")].map(cell => cleanWikiText(cell.textContent));
      if (cells.length < 4) return null;
      const parsed = parseEventDate(cells[1]);
      if (!parsed || parsed < today) return null;
      return { event: cells[0], date: cells[1], venue: cells[2], location: cells[3], parsed };
    }).filter(Boolean).sort((a, b) => a.parsed - b.parsed).slice(0, 3);
  }

  function renderEventCards(events, source) {
    const list = $("#events-list");
    list.innerHTML = "";
    events.forEach(ev => {
      const card = document.createElement("article");
      card.className = "event-card";
      card.innerHTML = `<p class="event-date">${esc(ev.date)}</p>
        <h2>${esc(ev.event)}</h2>
        <p>${esc(ev.venue)}</p>
        <p class="muted">${esc(ev.location)}</p>`;
      list.appendChild(card);
    });
    $("#events-source").innerHTML = `${esc(source)} · <a href="https://en.wikipedia.org/wiki/List_of_UFC_events" target="_blank" rel="noopener">Wikipedia schedule</a>`;
  }

  async function renderEvents() {
    renderEventCards(EVENT_FALLBACK, "Loading live schedule");
    try {
      const events = await fetchUpcomingEvents();
      renderEventCards(events.length ? events : EVENT_FALLBACK, events.length ? "Live schedule" : "Fallback schedule");
    } catch {
      renderEventCards(EVENT_FALLBACK, "Fallback schedule");
    }
  }

  // ---------- profile ----------
  async function renderProfile() {
    const body = $("#profile-body");
    if (!store.user || !store.user.nameChosen) {
      body.innerHTML = `<h1>Profile</h1><p class="muted">Sign in to claim your fighter name, track Glory Points, and start a trophy shelf.</p>
        <button class="btn btn-primary" id="p-signin">Sign in</button>`;
      $("#p-signin").onclick = openAuth; return;
    }
    const pts = await store.getPoints();
    const rows = await store.getLeaderboard();
    const rank = rows.findIndex(r => r.me) + 1;
    const trophies = await store.getTrophies();
    const history = await store.getPointHistory(30);
    const shelf = trophies.length
      ? trophies.map(t => `<div class="trophy ${t.kind}">
          <div class="trophy-ico">${t.icon}</div>
          <div class="trophy-title">${esc(t.title)}</div>
          <div class="trophy-sub">${esc(t.sub || t.eventTitle)}</div>
          <div class="trophy-season">Season ${t.season}</div></div>`).join("")
      : `<p class="muted">No trophies yet. Predict a full card to earn a 🥊 badge — finish top 5 for a belt.</p>`;
    body.innerHTML = `
      <div class="profile-head">
        <div class="avatar big" style="background:var(--panel2)">👤</div>
        <div><h1>${esc(store.user.name)}</h1>
          <p class="muted">Season ${CFG.CURRENT_SEASON} · Rank ${rank > 0 ? "#" + rank : "—"}</p></div>
        <div class="bank"><span class="bank-label">GLORY POINTS</span>
          <span class="bank-value">${pts}</span><span class="bank-note">resets Jan 1</span></div>
      </div>
      <h2 style="margin-top:24px">🏆 Trophy Shelf <span class="small muted">(virtual · zero value · bragging rights)</span></h2>
      <div class="shelf">${shelf}</div>
      <h2 style="margin-top:24px">Point History</h2>
      <div class="point-history">${renderPointHistory(history)}</div>
      <div style="margin-top:18px"><button class="btn btn-primary" id="prof-share">📣 Share my result</button></div>`;
    $("#prof-share").onclick = () => window.PKO.openShare();
  }

  function renderPointHistory(history) {
    if (!history.length) return `<p class="muted">No point history yet. Grants and predictions will appear here.</p>`;
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
  async function buildShareData() {
    const rec = await store.getEventRecord(EVENT.id);
    const rows = await store.getLeaderboard();
    const rank = rows.findIndex(r => r.me) + 1;
    const pts = await store.getPoints();
    return { rec, rank, pts, name: store.user ? store.user.name : "Fighter" };
  }

  function drawShareCard(d) {
    const c = $("#share-canvas"), x = c.getContext("2d");
    const W = c.width, H = c.height;
    // background
    const g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#1d1745"); g.addColorStop(1, "#0d0b1f");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.strokeStyle = "#ffd34d"; x.lineWidth = 6; x.strokeRect(8, 8, W - 16, H - 16);
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
    x.font = "40px serif"; x.textAlign = "right";
    x.fillText(belt ? belt.icon : "🥊", W - 40, 150);
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
    drawShareCard(d);
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
    renderPlay();
  });

  // ---------- boot ----------
  (async function boot() {
    await store.init();
    renderAccount();
    if (store.needsUsername()) openNameModal();
    route("play");
    renderCountdown();
    setInterval(renderCountdown, 30000);
    setInterval(() => { if (!$("#view-play").classList.contains("hidden")) renderPlay(); }, 60000);
  })();
})();
