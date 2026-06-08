// ===== PKO configuration =====
// Fill these in to switch from LOCAL mock mode to live Supabase.
// Leave SUPABASE_URL empty to run fully offline (localStorage) for development.
window.PKO_CONFIG = {
  // --- Supabase (free tier). Project Settings -> API ---
  // The anon/public key is SAFE to expose in client code — it's gated by RLS.
  // Never put the service_role / secret key here.
  SUPABASE_URL: "https://sjfyrmbyrbbvkhzhbipd.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqZnlybWJ5cmJidmtoemhiaXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NjYwODQsImV4cCI6MjA5NjM0MjA4NH0.J5NLlik-8OwfZ_JfplU2hM7Z-Meo-wfuqCWiaK4P60g",

  // --- Stripe donation (Payment Link). Pure tip jar, no in-game effect. ---
  STRIPE_DONATE_URL: "https://buy.stripe.com/eVqfZi3q20Dpff38IT0VO03",

  // --- Brevo newsletter (hosted form; no API key in frontend). ---
  BREVO_FORM_URL: "https://c8e915bf.sibforms.com/serve/MUIFAB3fsw87cvyScGSsxJuHvOPnytAxKUKMjNCXPBmG5rRdzp8q0o_OcxnVz3VRTDCSQt9-3JbflDjNGH5vNPP_xGpuH9_IW2TMDm1x58-Kt_9qKnsJH5n8THsfe8o6_QbswYn1CogziruohdP7Xxz5nHrJdhta4CbCnvaQV9XAehmaBXvqWCTmXcU5dAciYV8QNoJ5N-Qn4QJenQ==",
  MAJOR_EVENT_EMAIL_HOURS_BEFORE: 5,
  // Client display guard only. Real admin writes must be protected server-side.
  ADMIN_EMAILS: ["info@pixelknockout.com"],

  // --- Card difficulty data (The Odds API free tier: https://the-odds-api.com) ---
  // Leave blank to use the default difficulty numbers baked into data.js.
  // When set, external American prices are fetched and converted into the
  // multiplier a player gets. The multiplier is locked when they pick.
  ODDS_ENABLED: true,
  ODDS_API_KEY: "",
  ODDS_SPORT: "mma_mixed_martial_arts",
  ODDS_REGION: "us",         // us | uk | eu | au
  ODDS_MARKET: "h2h",
  ODDS_CACHE_MINUTES: 60,     // 24 pulls/day max per browser; use a server proxy for a global cap.
  EVENTS_CACHE_MINUTES: 30,   // Wikipedia schedule refresh window.

  // --- Local-only controls ---
  // Keep false in production. When true, locked demo cards show manual settle/void buttons.
  ENABLE_DEMO_SETTLEMENT: false,

  // --- Game economy (all free internet points, zero value) ---
  CURRENCY_NAME: "Glory Points",
  POINTS_SIGNUP: 1000,       // one-time welcome grant
  POINTS_DAILY: 10,          // daily login grant
  POINTS_PER_EVENT: 1000,    // free grant for each UFC/MMA event
  CURRENT_SEASON: new Date().getFullYear(), // leaderboard season; resets each year
};
