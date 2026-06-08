# PKO — Pixel Knockout 🥊

A free MMA prediction game. Predict which **pixel parody fighter** wins each bout,
earn **Glory Points**, climb the season leaderboard, wear a virtual belt. Glory
Points are **internet points only** — zero monetary value, can't be bought, sold,
traded, or cashed out. There is no paid entry and no reward of real-world value.

> Brand: **PKO** (Pixel Knockout). Flavor name: *"Player Kill Octagon."*
> Domain: `pixelknockout.com`.

## Run it locally (no setup)
Just open `index.html` in a browser. It runs in **LOCAL mode** using
`localStorage` — sign-in is simulated, you get 1,000 free Glory Points, you can
lock in predictions, hit **⚙ Settle (demo results)** to see scoring, and view the
leaderboard with belts. Great for development.

For a local web server (recommended, avoids any file:// quirks):
```powershell
python -m http.server 5173
# open http://localhost:5173
```

## Go live with Supabase (free)
1. Create a project at [supabase.com](https://supabase.com) (free tier).
2. SQL editor → run `supabase/schema.sql`.
3. Auth → Providers → enable **Email** (magic link) and **Google**
   (add Google OAuth credentials; redirect URL = your site URL).
4. Put your keys in `js/config.js`:
   ```js
   SUPABASE_URL: "https://xxxx.supabase.co",
   SUPABASE_ANON_KEY: "your-anon-key",
   ```
The app auto-switches to Supabase mode. Points can only be written by the
server-side `SECURITY DEFINER` functions — clients can never mint or transfer
them. That DB-level guarantee keeps the free-points economy enforceable.

## Donations (the only money path)
The Stripe Payment Link in `STRIPE_DONATE_URL` is labeled as an optional tip jar.
Tipping gives **nothing** in-game — no Glory Points, rank, picks, perks, badges,
belts, or advantages. Keep paid-entry and purchase-points language out of the UI
and the Stripe checkout.

## Major-event email alerts
The homepage and logged-in Profile view use an inline form that posts to the
hosted Brevo subscription form configured in `BREVO_FORM_URL`. Do not put a Brevo
API key in frontend code. Send campaigns from Brevo only for major cards, about
`MAJOR_EVENT_EMAIL_HOURS_BEFORE` hours before the event. The website collects
subscribers; Brevo owns consent, double opt-in, unsubscribe, and sending.

## Difficulty data
Set `ODDS_ENABLED: true` and add `ODDS_API_KEY` in `js/config.js` to pull MMA H2H
prices from The Odds API. The app matches each bout by fighter names, uses the
median American price across available bookmakers, and caches the snapshot for
`ODDS_CACHE_MINUTES`. If no match is found, the baked-in placeholder odds remain
and the Play screen says so.

Because this is a static site, a key placed in `js/config.js` is visible to users.
For production, prefer a Supabase Edge Function proxy that stores the odds key as
a server secret and returns only the matched odds snapshot.

## Upcoming event schedule
The Events page pulls the next two upcoming UFC events from Wikipedia's scheduled
events table and caches the result in the visitor's browser for
`EVENTS_CACHE_MINUTES` (30 minutes by default). If Wikipedia is temporarily
unavailable, the page falls back to the last cached schedule before using the
baked-in fallback list. This is client-side cache only; use a small server cache
or GitHub Action if you later need one shared schedule snapshot for every visitor.

## Event leaderboard and results
PKO has two leaderboard surfaces: the overall season leaderboard and a current
event leaderboard. The event leaderboard is based on the current card only and
updates after each settled fight. Use the locked `#admin` results page to enter
official/manual outcomes; the Supabase RPC checks the admin email allowlist,
settles each bout once, refunds cancelled/draw outcomes, writes point history,
and updates the event leaderboard. Use UFC.com results, UFCStats completed
events, or the event's Wikipedia page as the human verification source before
pressing settle. The Odds API is for card difficulty/pricing data, not official
results, and scraping Google is not a reliable production result feed.

## Deploy
Static site - publish this repository root on GitHub Pages, Vercel, or Netlify,
then point `pixelknockout.com` at it.

## Files
| File | Purpose |
| --- | --- |
| `index.html` | Markup + views (Play / Leaderboard / Events / Profile / Rules / Season / Fair Play / Legal / Priorities / How / Support) |
| `css/pixel.css` | Retro arcade theme |
| `js/config.js` | Your keys + economy settings |
| `js/data.js` | Pixel roster + ranking snapshot + legends archive + sample event card + difficulty multiplier |
| `js/store.js` | Auth + game state (local + Supabase backends) |
| `js/app.js` | UI + routing |
| `assets/flags/64x64/` | Square pixel flag icons for compact profile/UI labels |
| `assets/flags/64x48/` | Rectangular pixel flags for roster rows and wider country labels |
| `supabase/schema.sql` | Tables, RLS, server-only point functions |

## Launch checklist
- Stripe: verify the live Payment Link copy says optional tip/donation only and no in-game benefit.
- Domain: buy the Porkbun domain and point DNS to the deployed host.
- GitHub Pages: set the source to the repository root.
- Google OAuth: add the production origin and publish the consent screen.
- Supabase Auth: add the production Site URL and redirect URL.
- Supabase SQL: re-run `supabase/schema.sql` after schema edits.
- Admin settlement: confirm `admin_emails` contains your admin login email before settling real fights.
- Event bonuses: keep `event_bonus_windows` in `supabase/schema.sql` aligned with `PKO_EVENT.bonusWindows` in `js/data.js`.
- Demo settlement: keep `ENABLE_DEMO_SETTLEMENT` false in production.
- Difficulty data: add `ODDS_API_KEY` or proxy the feed through a Supabase Edge Function.
- Rankings: refresh `PKO_RANKINGS` from UFC.com before/after major cards; use Wikipedia as backup if the official page blocks.
- Legends: refresh `PKO_LEGENDS` records/facts from official UFC profiles, UFCStats, Sherdog/Tapology, or Wikipedia before using the archive as a public stats reference.
- Assets: convert fighter art to transparent 128×128 PNG sprites before wiring `img` paths.
- Flags: keep country flags in both `assets/flags/64x64/` and `assets/flags/64x48/`; display smaller with `image-rendering: pixelated`.

## Guardrails baked in
- No "buy points" path anywhere. Points are granted free, equally, every event.
- No transfer/trade between users. No cash-out.
- Top-5 belts are cosmetic, zero value, reset with the season (2026, 2027, …).
- Independent fan-game presentation — no real logos, names-as-branding, or official imagery; disclaimers in footer.
