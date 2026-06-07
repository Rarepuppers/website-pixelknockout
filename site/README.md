# PKO — Pixel Knockout 🥊

A free MMA prediction game. Predict which **pixel parody fighter** wins each bout,
earn **Glory Points**, climb the season leaderboard, wear a virtual belt. Glory
Points are **internet points only** — zero monetary value, can't be bought, sold,
traded, or cashed out. **This is not gambling.**

> Brand: **PKO** (Pixel Knockout). Flavor name: *"Player Kill Octagon."*
> Domain: `pixelknockout.com`.

## Run it locally (no setup)
Just open `index.html` in a browser. It runs in **LOCAL mode** using
`localStorage` — sign-in is simulated, you get 1,000 free Glory Points, you can
lock in predictions, hit **⚙ Settle (demo results)** to see scoring, and view the
leaderboard with belts. Great for development.

For a local web server (recommended, avoids any file:// quirks):
```powershell
cd site
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
them. That DB-level guarantee is what keeps the "not gambling" story airtight.

## Donations (the only money path)
Create a [Stripe Payment Link](https://stripe.com/payments/payment-links) labeled
"Support the dev / Donate" and paste it into `STRIPE_DONATE_URL` in `js/config.js`.
Donating gives **nothing** in-game — pure tip jar. Keep all "bet/wager/buy points"
language out of the UI and the Stripe checkout.

## Deploy
Static site — drop the `site/` folder on **Vercel** or **Netlify** (free tier),
point `pixelknockout.com` at it.

## Files
| File | Purpose |
| --- | --- |
| `index.html` | Markup + views (Play / Leaderboard / Events / How / Support) |
| `css/pixel.css` | Retro arcade theme |
| `js/config.js` | Your keys + economy settings |
| `js/data.js` | Parody roster + sample event card + odds→multiplier |
| `js/store.js` | Auth + game state (local + Supabase backends) |
| `js/app.js` | UI + routing |
| `supabase/schema.sql` | Tables, RLS, server-only point functions |

## Launch checklist
- Stripe: replace `STRIPE_DONATE_URL` in `js/config.js` with the real Payment Link.
- Domain: buy the Porkbun domain and point DNS to the deployed host.
- GitHub/deploy host: connect the repo and set the site root to `website-pixelknockout/site`.
- Google OAuth: add the production origin and publish the consent screen.
- Supabase Auth: add the production Site URL and redirect URL.
- Supabase SQL: re-run `supabase/schema.sql` after schema edits.
- Assets: convert fighter art to transparent 128×128 PNG sprites before wiring `img` paths.

## Guardrails baked in
- No "buy points" path anywhere. Points are granted free, equally, every event.
- No transfer/trade between users. No cash-out.
- Top-5 belts are cosmetic, zero value, reset with the season (2026, 2027, …).
- Parody only — no real logos, names-as-branding, or likenesses; disclaimers in footer.
