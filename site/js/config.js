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
  STRIPE_DONATE_URL: "https://donate.stripe.com/REPLACE_ME",

  // --- Odds feed (The Odds API free tier: https://the-odds-api.com) ---
  // Leave blank to use the placeholder odds baked into data.js.
  // When set, real American odds are fetched and the multiplier a player gets
  // is LOCKED to the odds at the moment they lock in their pick.
  ODDS_API_KEY: "",
  ODDS_SPORT: "mma_mixed_martial_arts",
  ODDS_REGION: "us",         // us | uk | eu | au

  // --- Game economy (all free internet points, zero value) ---
  CURRENCY_NAME: "Glory Points",
  POINTS_SIGNUP: 1000,       // one-time welcome grant
  POINTS_DAILY: 10,          // daily login grant
  POINTS_PER_EVENT: 1000,    // free grant for each UFC/MMA event
  CURRENT_SEASON: new Date().getFullYear(), // leaderboard season; resets each year
};
