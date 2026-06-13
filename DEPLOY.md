# Deploying PKO

The app is a **static site** in the `website-pixelknockout/` repository root (HTML/CSS/JS, no build step).
It talks to Supabase directly using the public anon key in `js/config.js`.

## Fastest: Netlify Drop (no account integration, ~30s)
1. Go to https://app.netlify.com/drop
2. Drag the **`website-pixelknockout/`** folder contents onto the page.
3. You get a live URL like `https://random-name.netlify.app`.
4. (Optional) Claim the site to a free Netlify account to keep it + add a custom domain.

## Recommended for ongoing: Vercel (git-connected)
1. Push the repo to GitHub.
2. https://vercel.com → **New Project** → import the repo.
3. **Framework Preset:** Other. **Root Directory:** `website-pixelknockout`.
   No build command, no output directory (it's static).
4. **Deploy** → `https://<name>.vercel.app`.

## Custom domain (pixelknockout.com)
Add it in your host (Vercel/Netlify) → follow their DNS steps (CNAME / A record).

## ⚠️ After deploying — update auth or login breaks in production
Your local-only URLs won't authorize the live site. Add the production URL in two places:

1. **Supabase → Authentication → URL Configuration**
   - Site URL: `https://pixelknockout.com` (or your `*.vercel.app` URL)
   - Redirect URLs: add `https://pixelknockout.com/**`
2. **Google Cloud → APIs & Services → Credentials → your OAuth client**
   - Authorized JavaScript origins: add `https://pixelknockout.com`
   - (Redirect URI stays the Supabase callback — no change.)

## Rolling to the next event (no redeploy)
The active card is now built from Supabase, not hard-coded JS. To change events:
1. Insert/update a row in `events` (set `status`, `lock_time`, display fields).
2. Insert the bouts in `event_bouts` (real fighter names + American odds). Personas/
   art resolve automatically from `js/data.js` by real name — unknown fighters get a
   generated pixel persona.
3. (Optional) add live bonus windows in `event_bonus_windows`.
4. Set the old card's `status` to `archived` and the new one to `upcoming` (or `live`
   to force it). The frontend picks the current card via the `current_event` view;
   the Events page lists `upcoming_events`. If Supabase is unreachable, the app falls
   back to the offline card baked into `js/data.js`.

## Automated result settlement
A scheduled GitHub Action (`.github/workflows/pixelknockout-auto-settle.yml`) runs
`scripts/settle-results.mjs`. It cross-checks each finished main-card bout against
**Wikipedia + The Odds API** and settles a bout **only when both sources agree on a
clear winner** — ambiguous bouts (disagreement, missing data, draw/no-contest) are
left for a human admin. Writes go through the `auto_settle_bout` RPC, which only the
service_role key can call. Add these as **GitHub repo secrets** (Settings → Secrets
and variables → Actions):
- [ ] `SUPABASE_URL` — your project URL.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — Settings → API → service_role secret. **Server-side
      only.** Never put this in `config.js` or any frontend file.
- [x] `ODDS_API_KEY` — configured as a repository secret for content refresh. For
      automated settlement, keep it present so the cross-check can agree; without it
      the job safely settles nothing. (The same secret is reused by the content-refresh workflow.)
The in-app admin Results page still works for manual settlement and overrides; every
settlement (auto or manual) is recorded in the audit log.

## Before going fully public
- [x] Re-run `supabase/schema.sql` so the new event columns, `current_event` /
      `upcoming_events` views, and `auto_settle_bout` RPC exist.
- [x] Stripe: replace `STRIPE_DONATE_URL` in `config.js` with your real Payment Link.
- [x] Difficulty data: add the GitHub Secret `ODDS_API_KEY` for the scheduled cache.
- [x] Email forwarding: `info@pixelknockout.com` is configured.
- [ ] Google OAuth consent screen: **Publish app** (out of "Testing") so anyone can log in.
- [ ] Add `https://pixelknockout.com` to Supabase Auth and Google OAuth after DNS is live.
- [ ] Admin smoke test on the deployed domain: sign in, choose a profile name, submit picks, verify point history, run a name reset, point adjustment, manual award grant/revoke, and one test settlement.
- [ ] Social preview smoke test on the deployed domain: paste `https://pixelknockout.com` into a link preview debugger or chat app and confirm the OG image/title/description render.
- [ ] Rotate the Supabase secret key + DB password if they were ever in plaintext.
- [ ] Rotate the Google OAuth client secret if `googlecloud_oauth_client_secret.json` was ever shared or committed.
- [ ] Consider custom SMTP (Resend/Postmark) if you keep email magic-link sign-in.

## What I cannot do for you
I can't click "Deploy" in your Vercel/Netlify account. Everything above is the click-path; ping me with any
error (e.g. `redirect_uri_mismatch`) and I'll debug it.
