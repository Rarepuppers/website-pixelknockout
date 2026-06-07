// ===== PKO roster + real event card =====
// LEGAL MODEL:
//   • Each pixel fighter is an ORIGINAL PARODY persona (alias + art + flavor).
//     The generated alias never contains the real name.
//   • The real fighter's name appears only as a small FACTUAL tag ("as <real>")
//     so players know which scheduled bout they're predicting (nominative fair
//     use — same as any fantasy/prediction game). No logos/posters/likeness art.
//   • We only consume the real fight's RESULT to settle predictions.
//
// Real card source: UFC 329 — McGregor vs. Holloway 2 (Wikipedia). Bouts change
// close to the date; in production this is rebuilt from a feed. The card below is
// defined by REAL NAMES ONLY — personas are resolved at load from the authored
// map, falling back to a generator so ANY fighter gets a pixel persona.

// ---------- authored personas (famous / fun ones) ----------
// facts  = paraphrased PUBLIC facts (records/nicknames/nationality) — NOT copied
//          prose, so no copyright issue. flag/country power the hover tooltip.
// jokes  = invented MMA-humor "fun facts" — parody/opinion, kept good-natured
//          (never a false statement of fact that could defame).
// img    = OPTIONAL sprite path, e.g. img: "assets/fighters/mcgregor.png".
//          When set, the avatar shows that PNG; otherwise it falls back to emoji.
//          Drop 96×96 / 128×128 transparent PNGs in site/assets/fighters/.
window.PKO_PERSONAS = {
  "Conor McGregor": { name: "Connor McGregarious", tag: "Two suitcases of brick money 💼", emoji: "💰", color: "#4dc3ff",
    // img: "assets/fighters/mcgregor.png",   // ← uncomment once the sprite exists
    country: "Ireland", flag: "🇮🇪",
    facts: ["Former two-division UFC champion (featherweight & lightweight).", "Famous for a thunderous left hand — and even louder press conferences.", "Launched his own Irish whiskey brand."],
    jokes: ["Pixel power level measured entirely in 'whoever owns these suitcases'.", "Pre-fight trash talk accounts for ~30% of total striking output.", "Reportedly bills opponents for emotional damage."] },
  "Max Holloway": { name: "Maxx Hollagram", tag: "Blessed island striker 🌺", emoji: "🌺", color: "#4dffa3",
    // img: "assets/fighters/holloway.png",
    country: "United States (Hawaii)", flag: "🇺🇸",
    facts: ["Former UFC featherweight champion out of Hawaii.", "Known for relentless volume striking and a granite chin.", "Once pointed at his own chin to invite a final-round brawl."],
    jokes: ["Throws so many punches the pixel engine drops frames.", "Says 'It's Blessed' and his health bar quietly refills.", "Cardio sponsored by an unlimited buffet of jabs."] },
  "Paddy Pimblett": { name: "Patty 'Snackgremlin' Pim", tag: "Scouse who eats the buffet 🍔", emoji: "🍔", color: "#e0a73e",
    // img: "assets/fighters/pimblett.png",
    country: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    facts: ["Liverpool crowd favorite known as 'The Baddy'.", "Famous for dramatic weight swings between camps.", "Huge personality and reliable finisher."],
    jokes: ["Walks out at two completely different pixel weights.", "Haircut has its own entrance music.", "Post-fight interview runs longer than the fight."] },
  "Benoît Saint Denis": { name: "Benny 'God o' War' Dennis", tag: "Pixel soldier, never retreats 🪖", emoji: "⚔️", color: "#ff6a3d",
    country: "France", flag: "🇫🇷",
    facts: ["French lightweight nicknamed 'God of War'.", "Background in the military / special forces.", "Aggressive, forward-pressure grappler."],
    jokes: ["Treats every round like a beach landing.", "Refuses to retreat even when the pixels beg him to.", "Submission attempts arrive with a war cry."] },
  "Cory Sandhagen": { name: "Corey Sandman", tag: "Lulls you to sleep, then strikes 😴", emoji: "🌀", color: "#9a93c9",
    country: "United States", flag: "🇺🇸",
    facts: ["Top-ranked UFC bantamweight contender.", "Rangy, technical striker with creative kicks.", "Nicknamed 'The Sandman'."],
    jokes: ["Strikes from angles the pixel grid didn't know existed.", "So smooth opponents nod off standing up.", "Elbows land before the frame finishes rendering."] },
  "Mario Bautista": { name: "Mario Bautisto", tag: "Stomps in from a green pipe 🍄", emoji: "🍄", color: "#ff4d6d",
    country: "United States", flag: "🇺🇸",
    facts: ["Bantamweight known for slick submissions.", "Riding a long divisional win streak.", "Crafty, opportunistic grappler."],
    jokes: ["Emerges from a green pipe before round one.", "Collects submissions like gold coins.", "His 1-up mushroom is technically a banned substance."] },
  "Brandon Royval": { name: "Brandon Royale", tag: "Battle-royale chaos goblin 👑", emoji: "👑", color: "#ffd34d",
    country: "United States", flag: "🇺🇸",
    facts: ["High-action flyweight title contender.", "Famous for chaotic, all-action scrambles.", "Nicknamed 'Raw Dawg'."],
    jokes: ["Fights like the controller is unplugged — full chaos mode.", "No health bar, only vibes.", "Submits you and himself in the same scramble."] },
  "Gable Steveson": { name: "Gabe Slamson", tag: "Olympic-grade pixel suplex 🤼", emoji: "🥇", color: "#3a6ea5",
    country: "United States", flag: "🇺🇸",
    facts: ["Olympic gold medalist in wrestling.", "Crossed over from elite amateur wrestling.", "Heavyweight prospect."],
    jokes: ["Suplex animation is banned in three pixel states.", "Wrestling so good the cage files a complaint.", "Gravity is the opponent's real problem."] },
  "Robert Whittaker": { name: "Bobby the Reaper", tag: "Counter-striking grim pixel 💀", emoji: "💀", color: "#d7d2ff",
    country: "Australia", flag: "🇦🇺",
    facts: ["Former UFC middleweight champion.", "Australian counter-striking specialist, 'The Reaper'.", "Elite footwork and fight IQ."],
    jokes: ["Counters punches you haven't thrown yet.", "The Reaper collects pixels, not souls.", "Footwork tutorial sold separately."] },
  // (Lone'er Kavanagh, Elisha Ellison, Nikita Krylov intentionally left out to
  //  demonstrate the auto-generated 'Parts Unknown' fallback below.)
};

// ---------- country lookup (real name -> country + flag) ----------
// Used by the generator so auto-made personas still get a REAL flag. In
// production the country comes from the fighter feed; this map is the stopgap.
// Only list fighters you're confident about — unknowns fall back to Parts Unknown.
window.PKO_COUNTRIES = {
  // — on the current card —
  "Lone'er Kavanagh":  { country: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  "Nikita Krylov":     { country: "Ukraine", flag: "🇺🇦" },
  // — champions & top contenders (seed roster; extend freely) —
  "Islam Makhachev":   { country: "Russia", flag: "🇷🇺" },
  "Jon Jones":         { country: "United States", flag: "🇺🇸" },
  "Tom Aspinall":      { country: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  "Alex Pereira":      { country: "Brazil", flag: "🇧🇷" },
  "Magomed Ankalaev":  { country: "Russia", flag: "🇷🇺" },
  "Dricus du Plessis": { country: "South Africa", flag: "🇿🇦" },
  "Israel Adesanya":   { country: "Nigeria", flag: "🇳🇬" },
  "Sean Strickland":   { country: "United States", flag: "🇺🇸" },
  "Ilia Topuria":      { country: "Spain", flag: "🇪🇸" },
  "Alexander Volkanovski": { country: "Australia", flag: "🇦🇺" },
  "Merab Dvalishvili": { country: "Georgia", flag: "🇬🇪" },
  "Sean O'Malley":     { country: "United States", flag: "🇺🇸" },
  "Petr Yan":          { country: "Russia", flag: "🇷🇺" },
  "Alexandre Pantoja": { country: "Brazil", flag: "🇧🇷" },
  "Brandon Moreno":    { country: "Mexico", flag: "🇲🇽" },
  "Leon Edwards":      { country: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  "Kamaru Usman":      { country: "Nigeria", flag: "🇳🇬" },
  "Belal Muhammad":    { country: "United States", flag: "🇺🇸" },
  "Khamzat Chimaev":   { country: "United Arab Emirates", flag: "🇦🇪" },
  "Charles Oliveira":  { country: "Brazil", flag: "🇧🇷" },
  "Dustin Poirier":    { country: "United States", flag: "🇺🇸" },
  "Justin Gaethje":    { country: "United States", flag: "🇺🇸" },
  "Arman Tsarukyan":   { country: "Armenia", flag: "🇦🇲" },
  "Khabib Nurmagomedov": { country: "Russia", flag: "🇷🇺" },
  "Ciryl Gane":        { country: "France", flag: "🇫🇷" },
  "Jiří Procházka":    { country: "Czechia", flag: "🇨🇿" },
  "Jan Błachowicz":    { country: "Poland", flag: "🇵🇱" },
  "Valentina Shevchenko": { country: "Kyrgyzstan", flag: "🇰🇬" },
  "Zhang Weili":       { country: "China", flag: "🇨🇳" },
  "Amanda Nunes":      { country: "Brazil", flag: "🇧🇷" },
  "Yair Rodríguez":    { country: "Mexico", flag: "🇲🇽" },
  "Marlon Vera":       { country: "Ecuador", flag: "🇪🇨" },
  "Movsar Evloev":     { country: "Russia", flag: "🇷🇺" },
  "Colby Covington":   { country: "United States", flag: "🇺🇸" },
  "Jamahal Hill":      { country: "United States", flag: "🇺🇸" },
  // In production, prefer pulling `country` straight from the fighter feed so
  // you don't maintain this by hand — this map is just a convenient stopgap.
};

// ---------- deterministic persona generator ----------
// Same real name always yields the same pixel persona. Alias is fully invented.
const _ADJ = ["Crimson","Iron","Shadow","Turbo","Atomic","Frostbite","Thunder","Venom",
  "Golden","Savage","Phantom","Diesel","Cosmic","Rabid","Granite","Neon","Static","Rogue"];
const _NOUN = ["Cobra","Mauler","Gladiator","Viper","Bruiser","Hammer","Comet","Wolverine",
  "Juggernaut","Specter","Rhino","Falcon","Yeti","Marauder","Cyclone","Goblin","Kraken","Banshee"];
const _EMOJI = ["🥊","👊","🦾","⚡","🔥","🐍","🦅","🦏","🐺","💥","🗡️","🛡️","🦂","🐉","👾","🤖","🦖","🌪️"];
const _COLOR = ["#4dc3ff","#4dffa3","#ff4d6d","#e0a73e","#9a93c9","#ffd34d","#ff6a3d","#3a6ea5","#d7d2ff","#ff8a4d","#8a5a2b"];
const _TAGSUF = ["energy","fury","menace","chaos","precision","swagger","pressure","mayhem"];

function _hash(s, salt) {
  let h = salt | 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
window.PKO_makePersona = function (real) {
  const adj = _ADJ[_hash(real, 1) % _ADJ.length];
  const noun = _NOUN[_hash(real, 7) % _NOUN.length];
  const emoji = _EMOJI[_hash(real, 13) % _EMOJI.length];
  const color = _COLOR[_hash(real, 23) % _COLOR.length];
  const suf = _TAGSUF[_hash(real, 31) % _TAGSUF.length];
  const alias = `${adj} ${noun}`;
  const loc = window.PKO_COUNTRIES[real] || { country: "Parts Unknown", flag: "🏴" };
  const known = loc.country !== "Parts Unknown";
  return {
    name: alias, tag: `Pure ${adj.toLowerCase()} ${suf} ${emoji}`, emoji, color, generated: true,
    country: loc.country, flag: loc.flag,
    facts: known
      ? [`Competes out of ${loc.country}.`, "Full bio still loading — auto-generated challenger (real facts coming soon)."]
      : ["Bio still buffering… this challenger was auto-generated, so the real stats aren't wired in yet."],
    jokes: [`${alias} reportedly KO'd a CAPTCHA on the way in.`,
      `Scouting report: ${adj.toLowerCase()} all the way down.`,
      `Walkout song is just the dial-up tone.`],
  };
};

// alias map OR generated fallback, always with the real name attached
window.PKO_getPersona = function (real) {
  const base = window.PKO_PERSONAS[real] || window.PKO_makePersona(real);
  return Object.assign({ real }, base);
};

// ---------- the card (REAL NAMES ONLY; personas resolved below) ----------
const _CARD = {
  id: "ufc-329",
  title: "UFC 329 — KNOCKOUT KING vs THE BLESSED",
  realTitle: "Based on UFC 329: McGregor vs. Holloway 2",
  shortTitle: "UFC 329",
  date: "Sat Jul 11, 2026 · T-Mobile Arena, Las Vegas",
  // Predictions LOCK at the card's start time (when real odds close). ISO w/ tz.
  lockTime: "2026-07-11T19:00:00-07:00",
  endTime: "2026-07-11T23:00:00-07:00",
  bonusWindows: [
    {
      id: "ufc-329-live-checkin",
      label: "Live event check-in",
      description: "Visit during the live card and claim this one-time event bonus.",
      amount: 329,
      startTime: "2026-07-11T19:00:00-07:00",
      endTime: "2026-07-11T23:00:00-07:00",
    },
    {
      id: "ufc-329-main-event",
      label: "Main event bonus",
      description: "Available only during the expected five-round main event window.",
      amount: 200,
      startTime: "2026-07-11T22:35:00-07:00",
      endTime: "2026-07-11T23:00:00-07:00",
    },
  ],
  season: (window.PKO_CONFIG && window.PKO_CONFIG.CURRENT_SEASON) || new Date().getFullYear(),
  oddsSource: "placeholder",
  bouts: [
    { id: "b1", weight: "WELTERWEIGHT", aReal: "Conor McGregor",     bReal: "Max Holloway",       oddsA: +150, oddsB: -180, demoWinner: "b", result: null },
    { id: "b2", weight: "LIGHTWEIGHT",  aReal: "Paddy Pimblett",     bReal: "Benoît Saint Denis", oddsA: -145, oddsB: +125, demoWinner: "a", result: null },
    { id: "b3", weight: "BANTAMWEIGHT", aReal: "Cory Sandhagen",     bReal: "Mario Bautista",     oddsA: -200, oddsB: +170, demoWinner: "a", result: null },
    { id: "b4", weight: "FLYWEIGHT",    aReal: "Brandon Royval",     bReal: "Lone'er Kavanagh",   oddsA: -130, oddsB: +110, demoWinner: "a", result: null },
    { id: "b5", weight: "HEAVYWEIGHT",  aReal: "Gable Steveson",     bReal: "Elisha Ellison",     oddsA: -300, oddsB: +240, demoWinner: "a", result: null },
    { id: "b6", weight: "LIGHT HEAVY",  aReal: "Robert Whittaker",   bReal: "Nikita Krylov",      oddsA: -160, oddsB: +140, demoWinner: "a", result: null },
  ],
};
// resolve each fighter to a persona (authored or generated)
_CARD.bouts.forEach(b => { b.a = window.PKO_getPersona(b.aReal); b.b = window.PKO_getPersona(b.bReal); });
window.PKO_EVENT = _CARD;

window.PKO_EVENTS_FALLBACK = [
  {
    event: "UFC Freedom 250",
    date: "Jun 14, 2026",
    venue: "White House",
    location: "Washington, D.C., U.S.",
  },
  {
    event: "UFC Fight Night: Kape vs. Horiguchi",
    date: "Jun 20, 2026",
    venue: "Meta Apex",
    location: "Las Vegas, Nevada, U.S.",
  },
  {
    event: "UFC Fight Night: Fiziev vs. Torres",
    date: "Jun 27, 2026",
    venue: "National Gymnastics Arena",
    location: "Baku, Azerbaijan",
  },
];

// American odds -> decimal payout multiplier (what 1 staked point returns).
window.PKO_oddsToMultiplier = function (american) {
  return american < 0 ? 1 + 100 / Math.abs(american) : 1 + american / 100;
};
