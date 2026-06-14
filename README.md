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
For production, set the GitHub Secret `ODDS_API_KEY` and let the scheduled
content-refresh workflow build the public `js/generated-content.js` snapshot.
The app matches each bout by fighter names, uses the median American price across
available bookmakers, and caches the matched snapshot. If no match is found, the
baked-in placeholder odds remain and the Play screen says so.

For local-only development, `js/config.js` still supports `ODDS_ENABLED: true`
with `ODDS_API_KEY`, but that exposes the key to the browser and should not be
used on the public site.

Because this is a static site, a key placed in `js/config.js` is visible to users.
For production, prefer the included GitHub Action cache or a Supabase Edge
Function proxy that stores the odds key as a server secret and returns only the
matched odds snapshot.

## Automated content refresh
`scripts/refresh-content-cache.mjs` builds `js/generated-content.js` from public
schedule data and, when available, a server-side odds snapshot. The browser reads
that generated file first, then falls back to visitor-local cache and public
schedule fetches if needed.

GitHub Actions workflow:

```text
.github/workflows/pixelknockout-content-refresh.yml
```

Repository secret:

```text
ODDS_API_KEY
```

The workflow runs every six hours and can also be triggered manually from
Actions. It commits only generated cache files:

```text
website-pixelknockout/js/generated-content.js
website-pixelknockout/content/content-refresh-log.md
```

Do not store Supabase service-role keys, Brevo API keys, or sports-data API keys
in frontend JavaScript. GitHub Secrets are safe for this build-time cache because
only the matched public snapshot is committed.

## Upcoming event schedule
The Events page first uses `js/generated-content.js`, refreshed by GitHub Actions.
If that file is empty or stale, the page pulls the next two upcoming UFC events
from Wikipedia's scheduled events table and caches the result in the visitor's
browser for `EVENTS_CACHE_MINUTES` (30 minutes by default). If Wikipedia is
temporarily unavailable, the page falls back to the last cached schedule before
using the baked-in fallback list.

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

Operator notes live at `#ops` and are admin-gated in the UI. They cover the
pre-lock card check, one-bout-at-a-time settlement, post-event award review, and
correction workflow for overturned results or admin mistakes.

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
- Stripe: live Payment Link is configured; verify checkout copy says optional tip/donation only and no in-game benefit.
- Domain: buy the Porkbun domain and point DNS to the deployed host.
- Email: `info@pixelknockout.com` forwarding is configured.
- GitHub Pages: set the source to the repository root.
- Google OAuth: add the production origin and publish the consent screen.
- Supabase Auth: add the production Site URL and redirect URL.
- Supabase SQL: schema has been rerun after the launch/admin edits.
- Admin settlement: confirm `admin_emails` contains your admin login email before settling real fights.
- Admin smoke test: on the deployed domain, sign in, choose a profile name, submit picks, verify point history, reset a profile name, adjust points, grant/revoke a manual award, and run one test settlement.
- Admin content: review `#ops` before each event and keep audit-log reasons clear.
- Event bonuses: keep `event_bonus_windows` in `supabase/schema.sql` aligned with `PKO_EVENT.bonusWindows` in `js/data.js`.
- Demo settlement: keep `ENABLE_DEMO_SETTLEMENT` false in production.
- Difficulty data: GitHub Secret `ODDS_API_KEY` is configured for the scheduled cache.
- Social preview: after DNS is live, paste `https://pixelknockout.com` into a link preview debugger or chat app and confirm the OG image/title/description render.
- Rankings: refresh `PKO_RANKINGS` from UFC.com before/after major cards; use Wikipedia as backup if the official page blocks.
- Legends: refresh `PKO_LEGENDS` records/facts from official UFC profiles, UFCStats, Sherdog/Tapology, or Wikipedia before using the archive as a public stats reference.
- Assets: convert fighter art to transparent 128x128 PNG sprites before wiring `img` paths. Render them at 80x80 on matchup cards, 96x96 in profile/detail views, and 64x64 in roster rows.
- Flags: keep country flags in both `assets/flags/64x64/` and `assets/flags/64x48/`; display smaller with `image-rendering: pixelated`.

## Guardrails baked in
- No "buy points" path anywhere. Points are granted free, equally, every event.
- No transfer/trade between users. No cash-out.
- Top-5 belts are cosmetic, zero value, reset with the season (2026, 2027, …).
- Independent fan-game presentation — no real logos, names-as-branding, event posters, official imagery, or implication of UFC/fighter endorsement; disclaimers in footer, About, Terms, and Privacy.
