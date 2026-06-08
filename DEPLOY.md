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

## Before going fully public
- [ ] Stripe: replace `STRIPE_DONATE_URL` in `config.js` with your real Payment Link.
- [ ] Difficulty data: add `ODDS_API_KEY` in `config.js`, or proxy the feed through a Supabase Edge Function so the key is not exposed in static JS.
- [ ] Google OAuth consent screen: **Publish app** (out of "Testing") so anyone can log in.
- [ ] Rotate the Supabase secret key + DB password if they were ever in plaintext.
- [ ] Rotate the Google OAuth client secret if `googlecloud_oauth_client_secret.json` was ever shared or committed.
- [ ] Consider custom SMTP (Resend/Postmark) if you keep email magic-link sign-in.
- [ ] Have a lawyer skim Terms/Privacy before launch.

## What I cannot do for you
I can't click "Deploy" in your Vercel/Netlify account or push to your GitHub —
those need your credentials. Everything above is the click-path; ping me with any
error (e.g. `redirect_uri_mismatch`) and I'll debug it.
