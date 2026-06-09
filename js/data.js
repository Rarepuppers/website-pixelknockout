// ===== PKO roster + real event card =====
// LEGAL MODEL:
//   • Each pixel fighter is an ORIGINAL PARODY persona (alias + art + flavor).
//     The generated alias never contains the real name.
//   • The real fighter's name appears only as a small FACTUAL tag ("as <real>")
//     so players know which scheduled bout they're predicting (nominative fair
//     use — same as any fantasy/prediction game). No logos/posters/official art.
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
//          Drop 96x96 / 128x128 transparent PNGs in assets/fighters/.
window.PKO_PERSONAS = {
  "Conor McGregor": { name: "Connor McGregarious", tag: "Two suitcases of brick money 💼", emoji: "💰", color: "#4dc3ff",
    // img: "assets/fighters/mcgregor.png",   // ← uncomment once the sprite exists
    country: "Ireland", flag: "🇮🇪",
    facts: ["Former two-division UFC champion (featherweight & lightweight).", "Famous for a thunderous left hand — and even louder press conferences.", "Launched his own Irish whiskey brand."],
    quotes: ["Who the fook is that guy?", "Thanks for the cheese.", "Break out the red panties.", "Call me Mystic Mac, because I predict these things.", "If you can see it here, and have the courage to speak it, it will happen.", "Precision beats power, and timing beats speed."],
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

function _setPersonaImage(name, img) {
  if (window.PKO_PERSONAS[name]) window.PKO_PERSONAS[name].img = img;
}
_setPersonaImage("Conor McGregor", "assets/fighters/mcgregor-placeholder.svg");
_setPersonaImage("Max Holloway", "assets/fighters/holloway-placeholder.svg");
_setPersonaImage("Paddy Pimblett", "assets/fighters/pimblett-placeholder.svg");
_setPersonaImage("Benoît Saint Denis", "assets/fighters/saint-denis-placeholder.svg");
_setPersonaImage("Benoit Saint Denis", "assets/fighters/saint-denis-placeholder.svg");
_setPersonaImage("Cory Sandhagen", "assets/fighters/sandhagen-placeholder.svg");
_setPersonaImage("Robert Whittaker", "assets/fighters/whittaker-placeholder.svg");

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

// Recent numbered-event roster seeds. Source checked against Wikipedia result
// tables for UFC 328 (May 9, 2026) and UFC 327 (Apr 11, 2026).
window.PKO_RECENT_EVENT_ROSTER = {
  "ufc-328": {
    title: "UFC 328: Chimaev vs. Strickland",
    date: "2026-05-09",
    fighters: [
      { name: "Sean Strickland", weight: "Middleweight", country: "United States", flag: "🇺🇸" },
      { name: "Khamzat Chimaev", weight: "Middleweight", country: "United Arab Emirates", flag: "🇦🇪" },
      { name: "Joshua Van", weight: "Flyweight", country: "Myanmar", flag: "🇲🇲" },
      { name: "Tatsuro Taira", weight: "Flyweight", country: "Japan", flag: "🇯🇵" },
      { name: "Alexander Volkov", weight: "Heavyweight", country: "Russia", flag: "🇷🇺" },
      { name: "Waldo Cortes-Acosta", weight: "Heavyweight", country: "Dominican Republic", flag: "🇩🇴" },
      { name: "Sean Brady", weight: "Welterweight", country: "United States", flag: "🇺🇸" },
      { name: "Joaquin Buckley", weight: "Welterweight", country: "United States", flag: "🇺🇸" },
      { name: "King Green", weight: "Catchweight", country: "United States", flag: "🇺🇸" },
      { name: "Jeremy Stephens", weight: "Catchweight", country: "United States", flag: "🇺🇸" },
      { name: "Ateba Gautier", weight: "Middleweight", country: "Cameroon", flag: "🇨🇲" },
      { name: "Osman Diaz", weight: "Middleweight", country: "United States", flag: "🇺🇸" },
      { name: "Yaroslav Amosov", weight: "Welterweight", country: "Ukraine", flag: "🇺🇦" },
      { name: "Joel Álvarez", weight: "Welterweight", country: "Spain", flag: "🇪🇸" },
      { name: "Grant Dawson", weight: "Lightweight", country: "United States", flag: "🇺🇸" },
      { name: "Mateusz Rębecki", weight: "Lightweight", country: "Poland", flag: "🇵🇱" },
      { name: "Jim Miller", weight: "Lightweight", country: "United States", flag: "🇺🇸" },
      { name: "Jared Gordon", weight: "Lightweight", country: "United States", flag: "🇺🇸" },
      { name: "Roman Kopylov", weight: "Middleweight", country: "Russia", flag: "🇷🇺" },
      { name: "Marco Tulio", weight: "Middleweight", country: "Brazil", flag: "🇧🇷" },
      { name: "Pat Sabatini", weight: "Featherweight", country: "United States", flag: "🇺🇸" },
      { name: "William Gomis", weight: "Featherweight", country: "France", flag: "🇫🇷" },
      { name: "Baisangur Susurkaev", weight: "Middleweight", country: "Russia", flag: "🇷🇺" },
      { name: "Djorden Santos", weight: "Middleweight", country: "Brazil", flag: "🇧🇷" },
      { name: "Jose Ochoa", weight: "Flyweight", country: "Peru", flag: "🇵🇪" },
      { name: "Clayton Carpenter", weight: "Flyweight", country: "United States", flag: "🇺🇸" },
    ],
  },
  "ufc-327": {
    title: "UFC 327: Procházka vs. Ulberg",
    date: "2026-04-11",
    fighters: [
      { name: "Carlos Ulberg", weight: "Light Heavyweight", country: "New Zealand", flag: "🇳🇿" },
      { name: "Jiří Procházka", weight: "Light Heavyweight", country: "Czechia", flag: "🇨🇿" },
      { name: "Paulo Costa", weight: "Light Heavyweight", country: "Brazil", flag: "🇧🇷" },
      { name: "Azamat Murzakanov", weight: "Light Heavyweight", country: "Russia", flag: "🇷🇺" },
      { name: "Josh Hokit", weight: "Heavyweight", country: "United States", flag: "🇺🇸" },
      { name: "Curtis Blaydes", weight: "Heavyweight", country: "United States", flag: "🇺🇸" },
      { name: "Dominick Reyes", weight: "Light Heavyweight", country: "United States", flag: "🇺🇸" },
      { name: "Johnny Walker", weight: "Light Heavyweight", country: "Brazil", flag: "🇧🇷" },
      { name: "Cub Swanson", weight: "Featherweight", country: "United States", flag: "🇺🇸" },
      { name: "Nate Landwehr", weight: "Featherweight", country: "United States", flag: "🇺🇸" },
      { name: "Aaron Pico", weight: "Featherweight", country: "United States", flag: "🇺🇸" },
      { name: "Patrício Pitbull", weight: "Featherweight", country: "Brazil", flag: "🇧🇷" },
      { name: "Kevin Holland", weight: "Welterweight", country: "United States", flag: "🇺🇸" },
      { name: "Randy Brown", weight: "Welterweight", country: "Jamaica", flag: "🇯🇲" },
      { name: "Mateusz Gamrot", weight: "Lightweight", country: "Poland", flag: "🇵🇱" },
      { name: "Esteban Ribovics", weight: "Lightweight", country: "Argentina", flag: "🇦🇷" },
      { name: "Tatiana Suarez", weight: "Women's Strawweight", country: "United States", flag: "🇺🇸" },
      { name: "Loopy Godínez", weight: "Women's Strawweight", country: "Mexico", flag: "🇲🇽" },
      { name: "Chris Padilla", weight: "Catchweight", country: "United States", flag: "🇺🇸" },
      { name: "MarQuel Mederos", weight: "Catchweight", country: "United States", flag: "🇺🇸" },
      { name: "Vicente Luque", weight: "Middleweight", country: "Brazil", flag: "🇧🇷" },
      { name: "Kelvin Gastelum", weight: "Middleweight", country: "United States", flag: "🇺🇸" },
      { name: "Charles Radtke", weight: "Welterweight", country: "United States", flag: "🇺🇸" },
      { name: "Francisco Prado", weight: "Welterweight", country: "Argentina", flag: "🇦🇷" },
    ],
  },
};

window.PKO_UPCOMING_EVENT_ROSTER = {
  "ufc-freedom-250": {
    title: "UFC Freedom 250",
    date: "2026-06-14",
    fighters: [
      { name: "Ilia Topuria", weight: "Lightweight", country: "Spain", flag: "🇪🇸" },
      { name: "Justin Gaethje", weight: "Lightweight", country: "United States", flag: "🇺🇸" },
      { name: "Alex Pereira", weight: "Heavyweight", country: "Brazil", flag: "🇧🇷" },
      { name: "Ciryl Gane", weight: "Heavyweight", country: "France", flag: "🇫🇷" },
      { name: "Sean O'Malley", weight: "Bantamweight", country: "United States", flag: "🇺🇸" },
      { name: "Aiemann Zahabi", weight: "Bantamweight", country: "Canada", flag: "🇨🇦" },
      { name: "Maurício Ruffy", weight: "Lightweight", country: "Brazil", flag: "🇧🇷" },
      { name: "Michael Chandler", weight: "Lightweight", country: "United States", flag: "🇺🇸" },
      { name: "Bo Nickal", weight: "Middleweight", country: "United States", flag: "🇺🇸" },
      { name: "Kyle Daukaus", weight: "Middleweight", country: "United States", flag: "🇺🇸" },
      { name: "Diego Lopes", weight: "Featherweight", country: "Brazil", flag: "🇧🇷" },
      { name: "Steve Garcia", weight: "Featherweight", country: "United States", flag: "🇺🇸" },
      { name: "Derrick Lewis", weight: "Heavyweight", country: "United States", flag: "🇺🇸" },
      { name: "Josh Hokit", weight: "Heavyweight", country: "United States", flag: "🇺🇸" },
      { name: "Arman Tsarukyan", weight: "Lightweight", country: "Armenia", flag: "🇦🇲", role: "backup" },
    ],
  },
  "ufc-329": {
    title: "UFC 329: McGregor vs. Holloway 2",
    date: "2026-07-11",
    fighters: [
      { name: "Conor McGregor", weight: "Welterweight", country: "Ireland", flag: "🇮🇪" },
      { name: "Max Holloway", weight: "Welterweight", country: "United States (Hawaii)", flag: "🇺🇸" },
      { name: "Paddy Pimblett", weight: "Lightweight", country: "England", flag: "🏴" },
      { name: "Benoît Saint Denis", weight: "Lightweight", country: "France", flag: "🇫🇷" },
      { name: "Cory Sandhagen", weight: "Bantamweight", country: "United States", flag: "🇺🇸" },
      { name: "Mario Bautista", weight: "Bantamweight", country: "United States", flag: "🇺🇸" },
      { name: "Brandon Royval", weight: "Flyweight", country: "United States", flag: "🇺🇸" },
      { name: "Lone'er Kavanagh", weight: "Flyweight", country: "England", flag: "🏴" },
      { name: "Gable Steveson", weight: "Heavyweight", country: "United States", flag: "🇺🇸" },
      { name: "Elisha Ellison", weight: "Heavyweight", country: "United States", flag: "🇺🇸" },
      { name: "Robert Whittaker", weight: "Light Heavyweight", country: "Australia", flag: "🇦🇺" },
      { name: "Nikita Krylov", weight: "Light Heavyweight", country: "Ukraine", flag: "🇺🇦" },
      { name: "Cody Garbrandt", weight: "Bantamweight", country: "United States", flag: "🇺🇸" },
      { name: "Adrian Yañez", weight: "Bantamweight", country: "United States", flag: "🇺🇸" },
      { name: "Tracy Cortez", weight: "Women's Flyweight", country: "United States", flag: "🇺🇸" },
      { name: "Wang Cong", weight: "Women's Flyweight", country: "China", flag: "🇨🇳" },
      { name: "Damian Pinas", weight: "Middleweight", country: "Suriname", flag: "🇸🇷" },
      { name: "César Almeida", weight: "Middleweight", country: "Brazil", flag: "🇧🇷" },
      { name: "Luke Riley", weight: "Featherweight", country: "England", flag: "🏴" },
      { name: "Kai Kamaka III", weight: "Featherweight", country: "United States (Hawaii)", flag: "🇺🇸" },
      { name: "Ryan Gandra", weight: "Middleweight", country: "Parts Unknown", flag: "🏴" },
      { name: "Zachary Reese", weight: "Middleweight", country: "United States", flag: "🇺🇸" },
      { name: "Ode' Osbourne", weight: "Flyweight", country: "Jamaica", flag: "🇯🇲" },
      { name: "Cody Durden", weight: "Flyweight", country: "United States", flag: "🇺🇸" },
      { name: "King Green", weight: "Lightweight", country: "United States", flag: "🇺🇸", role: "announced" },
      { name: "Terrance McKinney", weight: "Lightweight", country: "United States", flag: "🇺🇸", role: "announced" },
      { name: "Farid Basharat", weight: "Bantamweight", country: "Afghanistan", flag: "🇦🇫", role: "announced" },
      { name: "Ethyn Ewing", weight: "Bantamweight", country: "United States", flag: "🇺🇸", role: "announced" },
    ],
  },
};

window.PKO_POST_329_EVENT_ROSTER = {
  "ufc-fight-night-281": {
    title: "UFC Fight Night 281",
    date: "2026-07-18",
    fighters: [
      { name: "Amanda Ribas", weight: "Women's Strawweight", country: "Brazil", flag: "🇧🇷" },
      { name: "Fatima Kline", weight: "Women's Strawweight", country: "United States", flag: "🇺🇸" },
      { name: "Brad Tavares", weight: "Middleweight", country: "United States", flag: "🇺🇸" },
      { name: "Marc-André Barriault", weight: "Middleweight", country: "Canada", flag: "🇨🇦" },
      { name: "Veronica Hardy", weight: "Women's Flyweight", country: "Venezuela", flag: "🇻🇪" },
      { name: "Dione Barbosa", weight: "Women's Flyweight", country: "Brazil", flag: "🇧🇷" },
      { name: "Kevin Holland", weight: "Welterweight", country: "United States", flag: "🇺🇸", role: "reported" },
      { name: "Jacobe Smith", weight: "Welterweight", country: "United States", flag: "🇺🇸", role: "reported" },
      { name: "Jared Cannonier", weight: "Middleweight", country: "United States", flag: "🇺🇸", role: "reported" },
      { name: "Christian Leroy Duncan", weight: "Middleweight", country: "England", flag: "🏴", role: "reported" },
      { name: "Alvin Hines", weight: "Heavyweight", country: "United States", flag: "🇺🇸", role: "reported" },
      { name: "Allen Frye Jr.", weight: "Heavyweight", country: "United States", flag: "🇺🇸", role: "reported" },
      { name: "Chase Hooper", weight: "Lightweight", country: "United States", flag: "🇺🇸", role: "reported" },
      { name: "Mitch Ramirez", weight: "Lightweight", country: "United States", flag: "🇺🇸", role: "reported" },
      { name: "Felipe Franco", weight: "Light Heavyweight", country: "Brazil", flag: "🇧🇷", role: "reported" },
      { name: "Levi Rodrigues Jr.", weight: "Light Heavyweight", country: "Brazil", flag: "🇧🇷", role: "reported" },
      { name: "Alden Coria", weight: "Flyweight", country: "United States", flag: "🇺🇸", role: "reported" },
      { name: "Stewart Nicoll", weight: "Flyweight", country: "Australia", flag: "🇦🇺", role: "reported" },
    ],
  },
  "ufc-fight-night-282": {
    title: "UFC Fight Night 282",
    date: "2026-08-01",
    fighters: [
      { name: "Ante Delija", weight: "Heavyweight", country: "Croatia", flag: "🇭🇷" },
      { name: "Johnny Walker", weight: "Heavyweight", country: "Brazil", flag: "🇧🇷" },
      { name: "Marcin Tybura", weight: "Heavyweight", country: "Poland", flag: "🇵🇱" },
      { name: "Aleksandar Rakić", weight: "Heavyweight", country: "Austria", flag: "🇦🇹" },
    ],
  },
};

window.PKO_POPULAR_ROSTER_SEEDS = {
  "fan-favorites-and-contenders": {
    title: "Fan favorites and current contenders",
    fighters: [
      { name: "Kayla Harrison", weight: "Women's Bantamweight", country: "United States", flag: "🇺🇸" },
      { name: "Jack Della Maddalena", weight: "Welterweight", country: "Australia", flag: "🇦🇺" },
      { name: "Shavkat Rakhmonov", weight: "Welterweight", country: "Kazakhstan", flag: "🇰🇿" },
      { name: "Ian Machado Garry", weight: "Welterweight", country: "Ireland", flag: "🇮🇪" },
      { name: "Umar Nurmagomedov", weight: "Bantamweight", country: "Russia", flag: "🇷🇺" },
      { name: "Aljamain Sterling", weight: "Featherweight", country: "United States", flag: "🇺🇸" },
      { name: "Deiveson Figueiredo", weight: "Bantamweight", country: "Brazil", flag: "🇧🇷" },
      { name: "Jean Silva", weight: "Featherweight", country: "Brazil", flag: "🇧🇷" },
      { name: "Alexa Grasso", weight: "Women's Flyweight", country: "Mexico", flag: "🇲🇽" },
      { name: "Rose Namajunas", weight: "Women's Flyweight", country: "United States", flag: "🇺🇸" },
      { name: "Julianna Peña", weight: "Women's Bantamweight", country: "United States", flag: "🇺🇸" },
      { name: "Raul Rosas Jr.", weight: "Bantamweight", country: "United States", flag: "🇺🇸" },
    ],
  },
};

[window.PKO_RECENT_EVENT_ROSTER, window.PKO_UPCOMING_EVENT_ROSTER, window.PKO_POST_329_EVENT_ROSTER, window.PKO_POPULAR_ROSTER_SEEDS].forEach(roster => Object.values(roster).forEach(event => {
  event.fighters.forEach(f => {
    window.PKO_COUNTRIES[f.name] = window.PKO_COUNTRIES[f.name] || { country: f.country, flag: f.flag };
  });
}));

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

// ---------- rankings snapshot ----------
// Source: UFC rankings snapshot via Wikipedia backup, updated June 2, 2026.
// Refresh around major cards from https://www.ufc.com/rankings first, then
// https://en.wikipedia.org/wiki/UFC_rankings if the official page blocks.
window.PKO_RANKINGS = {
  source: "UFC rankings",
  sourceUrl: "https://www.ufc.com/rankings",
  backupUrl: "https://en.wikipedia.org/wiki/UFC_rankings",
  updated: "2026-06-02",
  fighters: {
    "Tom Aspinall": { division: "Heavyweight", champion: true, p4p: 6 },
    "Ciryl Gane": { division: "Heavyweight", rank: 1 },
    "Alexander Volkov": { division: "Heavyweight", rank: 2 },
    "Waldo Cortes-Acosta": { division: "Heavyweight", rank: 4 },
    "Josh Hokit": { division: "Heavyweight", rank: 5 },
    "Curtis Blaydes": { division: "Heavyweight", rank: 7 },
    "Derrick Lewis": { division: "Heavyweight", rank: 9 },
    "Ante Delija": { division: "Heavyweight", rank: 11 },
    "Marcin Tybura": { division: "Heavyweight", rank: 12 },
    "Carlos Ulberg": { division: "Light Heavyweight", champion: true, p4p: 14 },
    "Magomed Ankalaev": { division: "Light Heavyweight", rank: 1 },
    "Alex Pereira": { division: "Light Heavyweight", rank: 2, p4p: 4 },
    "Jiří Procházka": { division: "Light Heavyweight", rank: 3 },
    "Jan Błachowicz": { division: "Light Heavyweight", rank: 4 },
    "Sean Strickland": { division: "Middleweight", champion: true, p4p: 8 },
    "Khamzat Chimaev": { division: "Middleweight", rank: 1, p4p: 10 },
    "Dricus du Plessis": { division: "Middleweight", rank: 2, p4p: 13 },
    "Israel Adesanya": { division: "Middleweight", rank: 9 },
    "Robert Whittaker": { division: "Middleweight", rank: 10 },
    "Jared Cannonier": { division: "Middleweight", rank: 11 },
    "Christian Leroy Duncan": { division: "Middleweight", rank: 13 },
    "Islam Makhachev": { division: "Welterweight", champion: true, p4p: 1 },
    "Ian Machado Garry": { division: "Welterweight", rank: 1 },
    "Jack Della Maddalena": { division: "Welterweight", rank: 4 },
    "Belal Muhammad": { division: "Welterweight", rank: 5 },
    "Sean Brady": { division: "Welterweight", rank: 6 },
    "Kamaru Usman": { division: "Welterweight", rank: 8 },
    "Joaquin Buckley": { division: "Welterweight", rank: 9 },
    "Yaroslav Amosov": { division: "Welterweight", rank: 10 },
    "Ilia Topuria": { division: "Lightweight", champion: true, p4p: 2 },
    "Justin Gaethje": { division: "Lightweight", interim: true },
    "Arman Tsarukyan": { division: "Lightweight", rank: 2, p4p: 15 },
    "Charles Oliveira": { division: "Lightweight", rank: 3, p4p: 12 },
    "Max Holloway": { division: "Lightweight", rank: 4 },
    "Benoît Saint Denis": { division: "Lightweight", rank: 5 },
    "Paddy Pimblett": { division: "Lightweight", rank: 6 },
    "Mateusz Gamrot": { division: "Lightweight", rank: 7 },
    "Maurício Ruffy": { division: "Lightweight", rank: "9T" },
    "Michael Chandler": { division: "Lightweight", rank: 13 },
    "Alexander Volkanovski": { division: "Featherweight", champion: true, p4p: 3 },
    "Movsar Evloev": { division: "Featherweight", rank: 1 },
    "Diego Lopes": { division: "Featherweight", rank: 2 },
    "Aljamain Sterling": { division: "Featherweight", rank: 4 },
    "Yair Rodríguez": { division: "Featherweight", rank: 5 },
    "Jean Silva": { division: "Featherweight", rank: 6 },
    "Steve Garcia": { division: "Featherweight", rank: 9 },
    "Aaron Pico": { division: "Featherweight", rank: 12 },
    "Petr Yan": { division: "Bantamweight", champion: true, p4p: 5 },
    "Merab Dvalishvili": { division: "Bantamweight", rank: 1, p4p: 7 },
    "Umar Nurmagomedov": { division: "Bantamweight", rank: 2 },
    "Sean O'Malley": { division: "Bantamweight", rank: 3 },
    "Cory Sandhagen": { division: "Bantamweight", rank: 4 },
    "Aiemann Zahabi": { division: "Bantamweight", rank: 6 },
    "Mario Bautista": { division: "Bantamweight", rank: 7 },
    "Deiveson Figueiredo": { division: "Bantamweight", rank: 9 },
    "Marlon Vera": { division: "Bantamweight", rank: 10 },
    "Raul Rosas Jr.": { division: "Bantamweight", rank: 13 },
    "Farid Basharat": { division: "Bantamweight", rank: 15 },
    "Joshua Van": { division: "Flyweight", champion: true, p4p: 9 },
    "Alexandre Pantoja": { division: "Flyweight", rank: 1, p4p: 11 },
    "Tatsuro Taira": { division: "Flyweight", rank: 3 },
    "Brandon Royval": { division: "Flyweight", rank: 4 },
    "Lone'er Kavanagh": { division: "Flyweight", rank: 6 },
    "Brandon Moreno": { division: "Flyweight", rank: 9 },
    "Kayla Harrison": { division: "Women's Bantamweight", champion: true, p4p: 2 },
    "Julianna Peña": { division: "Women's Bantamweight", rank: 1 },
    "Valentina Shevchenko": { division: "Women's Flyweight", champion: true, p4p: 1 },
    "Alexa Grasso": { division: "Women's Flyweight", rank: 3, p4p: 7 },
    "Rose Namajunas": { division: "Women's Flyweight", rank: 5, p4p: 14 },
    "Tracy Cortez": { division: "Women's Flyweight", rank: 8 },
    "Wang Cong": { division: "Women's Flyweight", rank: 12 },
    "Mackenzie Dern": { division: "Women's Strawweight", champion: true, p4p: 6 },
    "Zhang Weili": { division: "Women's Strawweight", rank: 1, p4p: 3 },
    "Tatiana Suarez": { division: "Women's Strawweight", rank: 2 },
    "Loopy Godínez": { division: "Women's Strawweight", rank: "6T" },
    "Amanda Ribas": { division: "Women's Strawweight", rank: 10 },
    "Fatima Kline": { division: "Women's Strawweight", rank: 11 },
  },
};

window.PKO_getRanking = function (real) {
  const ranking = window.PKO_RANKINGS.fighters[real];
  if (!ranking) return null;
  return Object.assign({ updated: window.PKO_RANKINGS.updated }, ranking);
};

window.PKO_LEGENDS = [
  {
    name: "Georges St-Pierre",
    pixelName: "Gorgeous Saint Pixel",
    country: "Canada",
    divisions: "Welterweight / Middleweight",
    record: "26-2",
    status: "Retired",
    badges: ["UFC Hall of Fame", "Former two-division UFC champion"],
    quote: "I am not impressed by your performance.",
    facts: ["One of MMA's most complete wrestle-boxers.", "Avenged both career losses.", "Returned after a long layoff to win the middleweight title."],
    fun: "Fights like a chess engine learned double-leg takedowns.",
  },
  {
    name: "Anderson Silva",
    pixelName: "Anderspin Silvabyte",
    country: "Brazil",
    divisions: "Middleweight / Light Heavyweight",
    record: "34-11, 1 NC",
    status: "Inactive / boxing crossover",
    badges: ["UFC Hall of Fame", "Former UFC middleweight champion"],
    quote: "I back.",
    facts: ["Held one of the longest title reigns in UFC history.", "Known for matrix-style head movement and counterstriking.", "Moved into boxing after his UFC run."],
    fun: "The dodge animation is longer than most fighters' highlight reels.",
  },
  {
    name: "Nate Diaz",
    pixelName: "Nate Dial-Up",
    country: "United States",
    divisions: "Lightweight / Welterweight",
    record: "21-13",
    status: "Inactive / free agent",
    badges: ["The Ultimate Fighter winner", "Fan favorite"],
    quote: "I'm not surprised.",
    facts: ["Known for pace, boxing volume, and elite jiu-jitsu.", "Submitted Conor McGregor in a major upset.", "Part of one of MMA's most popular sibling duos."],
    fun: "Health bar says empty; cardio bar says otherwise.",
  },
  {
    name: "Nick Diaz",
    pixelName: "Nick Dial-Up",
    country: "United States",
    divisions: "Welterweight / Middleweight",
    record: "26-10, 2 NC",
    status: "Inactive",
    badges: ["Former Strikeforce champion", "Fan favorite"],
    quote: "Don't be scared, homie.",
    facts: ["Pressure boxer with a dangerous guard.", "Known for volume striking and famous staredowns.", "A cult favorite across multiple MMA eras."],
    fun: "Taunt button is mapped to every button.",
  },
  {
    name: "Benson Henderson",
    pixelName: "Bendy Henderson",
    country: "United States",
    divisions: "Lightweight / Welterweight",
    record: "30-12",
    status: "Retired",
    badges: ["Former UFC lightweight champion", "Former WEC lightweight champion"],
    quote: "Smooth is fast.",
    facts: ["Known for durability, cardio, and wild submission escapes.", "Won major titles in WEC and UFC.", "Had a long post-UFC Bellator run."],
    fun: "Submission defense sponsored by a missing tap button.",
  },
  {
    name: "Lyoto Machida",
    pixelName: "Lyoto Match-ID",
    country: "Brazil",
    divisions: "Light Heavyweight / Middleweight",
    record: "26-12",
    status: "Inactive",
    badges: ["Former UFC light heavyweight champion"],
    quote: "The Dragon.",
    facts: ["Karate-based counterstriker with unusual timing.", "Won the UFC light heavyweight title in 2009.", "Fought elite names across two divisions."],
    fun: "Appears one tile away from where you aimed.",
  },
  {
    name: "Brock Lesnar",
    pixelName: "Block Lesnar",
    country: "United States",
    divisions: "Heavyweight",
    record: "5-3, 1 NC",
    status: "Inactive / pro wrestling",
    badges: ["Former UFC heavyweight champion", "Crossover star"],
    quote: "Can you see me now?",
    facts: ["Became UFC heavyweight champion in his fourth pro MMA fight.", "One of the biggest pay-per-view draws in combat sports.", "Returned to pro wrestling after MMA."],
    fun: "Character select screen says boss fight.",
  },
  {
    name: "Cain Velasquez",
    pixelName: "Cain Velocity",
    country: "United States",
    divisions: "Heavyweight",
    record: "14-3",
    status: "Retired",
    badges: ["Former UFC heavyweight champion"],
    quote: "Cardio kills.",
    facts: ["Heavyweight famous for relentless pace and wrestling pressure.", "Twice held the UFC heavyweight title.", "Had a famous rivalry with Junior dos Santos."],
    fun: "Heavyweight stamina bar forgot it was heavyweight.",
  },
  {
    name: "Chuck Liddell",
    pixelName: "Chuck Lid-Level",
    country: "United States",
    divisions: "Light Heavyweight",
    record: "21-9",
    status: "Retired",
    badges: ["UFC Hall of Fame", "Former UFC light heavyweight champion"],
    quote: "The Iceman.",
    facts: ["Helped define the early UFC light heavyweight era.", "Known for sprawl-and-brawl power punching.", "One of the first mainstream UFC stars."],
    fun: "Mohawk adds plus five intimidation.",
  },
  {
    name: "Randy Couture",
    pixelName: "Randy Couture-Cut",
    country: "United States",
    divisions: "Heavyweight / Light Heavyweight",
    record: "19-11",
    status: "Retired",
    badges: ["UFC Hall of Fame", "Former two-division UFC champion"],
    quote: "Captain America.",
    facts: ["Won UFC titles at heavyweight and light heavyweight.", "Known for clinch wrestling and veteran fight IQ.", "Had major wins deep into his 40s."],
    fun: "Age stat goes up; durability stat also goes up.",
  },
  {
    name: "Khabib Nurmagomedov",
    pixelName: "Kabob Nurmagamedodge",
    country: "Russia",
    divisions: "Lightweight",
    record: "29-0",
    status: "Retired",
    badges: ["Former UFC lightweight champion", "Undefeated"],
    quote: "Send me location.",
    facts: ["Retired undefeated at 29-0.", "Dominant pressure grappler and lightweight champion.", "Defended the UFC lightweight title three times."],
    fun: "The cage is just another grappling partner.",
  },
  {
    name: "Demetrious Johnson",
    pixelName: "Demetrius Joystick",
    country: "United States",
    divisions: "Flyweight",
    record: "25-4-1",
    status: "Retired",
    badges: ["Former UFC flyweight champion", "Former ONE champion"],
    quote: "Mighty Mouse.",
    facts: ["Set the UFC record for consecutive title defenses.", "Known for elite transitions and all-around skill.", "Won major titles in UFC and ONE."],
    fun: "Combo list requires a second controller.",
  },
  {
    name: "Ronda Rousey",
    pixelName: "Ronda Rowsy",
    country: "United States",
    divisions: "Women's Bantamweight",
    record: "12-2",
    status: "Retired",
    badges: ["UFC Hall of Fame", "Former UFC women's bantamweight champion"],
    quote: "Armbar season.",
    facts: ["First UFC women's champion.", "Olympic judo medalist.", "Helped bring women's MMA into the UFC mainstream."],
    fun: "Round one starts; arm already missing.",
  },
  {
    name: "Amanda Nunes",
    pixelName: "Amanda Nukes",
    country: "Brazil",
    divisions: "Women's Bantamweight / Women's Featherweight",
    record: "23-5",
    status: "Retired",
    badges: ["Former two-division UFC champion"],
    quote: "The Lioness.",
    facts: ["Held UFC titles in two divisions.", "Owns wins over many women's MMA champions.", "Retired as bantamweight champion."],
    fun: "Power stat has its own warning label.",
  },
  {
    name: "Jose Aldo",
    pixelName: "Jose All-Dodge",
    country: "Brazil",
    divisions: "Featherweight / Bantamweight",
    record: "32-9",
    status: "Inactive / boxing crossover",
    badges: ["UFC Hall of Fame", "Former UFC featherweight champion"],
    quote: "King of Rio.",
    facts: ["Dominant featherweight champion across WEC and UFC.", "Famous for brutal leg kicks and takedown defense.", "Later competed successfully at bantamweight."],
    fun: "Leg kick causes controller rumble two rounds later.",
  },
  {
    name: "Daniel Cormier",
    pixelName: "Daniel Controller",
    country: "United States",
    divisions: "Light Heavyweight / Heavyweight",
    record: "22-3, 1 NC",
    status: "Retired / broadcaster",
    badges: ["UFC Hall of Fame", "Former two-division UFC champion"],
    quote: "DC.",
    facts: ["Olympic wrestler and UFC two-division champion.", "Won titles at light heavyweight and heavyweight.", "Became a leading MMA broadcaster after retirement."],
    fun: "Wrestling stat remains active while commentating.",
  },
];

// alias map OR generated fallback, always with the real name attached
window.PKO_getPersona = function (real) {
  const base = window.PKO_PERSONAS[real] || window.PKO_makePersona(real);
  return Object.assign({ real, ranking: window.PKO_getRanking(real) }, base);
};

window.PKO_allRosterFighters = function () {
  const byName = new Map();
  const add = (f, eventTitle) => {
    if (!f || !f.name) return;
    const existing = byName.get(f.name) || {};
    byName.set(f.name, Object.assign({}, existing, f, {
      events: [...(existing.events || []), eventTitle].filter(Boolean),
    }));
  };

  Object.entries(window.PKO_PERSONAS || {}).forEach(([name, p]) => add({
    name, weight: p.weight || "Featured", country: p.country, flag: p.flag,
  }, "Featured"));
  [window.PKO_RECENT_EVENT_ROSTER, window.PKO_UPCOMING_EVENT_ROSTER, window.PKO_POST_329_EVENT_ROSTER, window.PKO_POPULAR_ROSTER_SEEDS]
    .forEach(roster => Object.values(roster || {}).forEach(event => (event.fighters || []).forEach(f => add(f, event.title))));
  (_CARD.bouts || []).forEach(b => {
    add({ name: b.aReal, weight: b.weight, country: b.a.country, flag: b.a.flag }, _CARD.title);
    add({ name: b.bReal, weight: b.weight, country: b.b.country, flag: b.b.flag }, _CARD.title);
  });

  return [...byName.values()].map(f => {
    const persona = window.PKO_getPersona(f.name);
    return Object.assign({}, f, {
      division: f.weight || "Featured",
      pixelName: persona.name,
      pixelTag: persona.tag,
      img: persona.img || "assets/fighters/placeholder-pixel-fighter.svg",
      emoji: persona.emoji,
      ranking: persona.ranking,
      country: persona.country || f.country || "Parts Unknown",
      flag: persona.flag || f.flag || "🏴",
    });
  }).sort((a, b) => a.division.localeCompare(b.division) || a.name.localeCompare(b.name));
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
    { id: "b1", cardSection: "main", playable: true, weight: "WELTERWEIGHT", aReal: "Conor McGregor",     bReal: "Max Holloway",       oddsA: +150, oddsB: -180, demoWinner: "b", winType: "unanimous decision", result: null },
    { id: "b2", cardSection: "main", playable: true, weight: "LIGHTWEIGHT",  aReal: "Paddy Pimblett",     bReal: "Benoît Saint Denis", oddsA: -145, oddsB: +125, demoWinner: "a", winType: "submission", result: null },
    { id: "b3", cardSection: "main", playable: true, weight: "BANTAMWEIGHT", aReal: "Cory Sandhagen",     bReal: "Mario Bautista",     oddsA: -200, oddsB: +170, demoWinner: "a", winType: "split decision", result: null },
    { id: "b4", cardSection: "undercard", playable: false, weight: "FLYWEIGHT",    aReal: "Brandon Royval",     bReal: "Lone'er Kavanagh",   oddsA: -130, oddsB: +110, demoWinner: "a", winType: "submission", result: null },
    { id: "b5", cardSection: "undercard", playable: false, weight: "HEAVYWEIGHT",  aReal: "Gable Steveson",     bReal: "Elisha Ellison",     oddsA: -300, oddsB: +240, demoWinner: "a", winType: "TKO", result: null },
    { id: "b6", cardSection: "undercard", playable: false, weight: "LIGHT HEAVY",  aReal: "Robert Whittaker",   bReal: "Nikita Krylov",      oddsA: -160, oddsB: +140, demoWinner: "a", winType: "decision", result: null },
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
