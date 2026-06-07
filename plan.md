# Project Plan: PKO — Pixel Knockout

> **PKO** — *Pixel Knockout* (and, for in-game flavor quotes, *"Player Kill
> Octagon"*). A fictional, gamified fan portal celebrating MMA culture through
> 100% original pixel-art parodies. It's a free game for fun and bragging rights
> with your friends and the r/MMA crowd. **No money, no gambling, no prizes —
> ever.**

---

## 0. Brand & Domain

- **Domain:** `pixelknockout.com`
- **Brand / short name:** **PKO**
- **Long name:** *Pixel Knockout*
- **Flavor name (for game quotes, loading screens, easter eggs):** *"Player Kill
  Octagon"* — e.g. `"Welcome to the Player Kill Octagon."`

**Trademark caution:** avoid "UFC", "Bellator", "PFL", "ONE", etc. in the brand,
art, or copy. "MMA" itself is generic and safe to use. We reference real events
only to pull results — we never use their logos, names as branding, or posters.

---

## 1. Core Vision & Legal Guardrails

The site is a **free, just-for-fun prediction game**. Before each real MMA/UFC
event, every player is handed the same free allotment of imaginary **Glory Points**
and **predicts** which pixel fighter wins each bout. Get it right, climb the
leaderboard, talk trash. That's the whole thing.

> **Language rule:** never say "bet" or "wager" in any user-facing copy. Players
> **predict / pick / call** a fight. Same action — but "predict" reads as a free
> game, "bet" reads as wagering. This wording is a legal guardrail, not a style
> choice.

### This Is Not Gambling — Hard Rules
The in-game currency is **Glory Points** — purely internet points, like Reddit
karma. To keep this unambiguous, the following are **structural, non-negotiable
rules baked into the product**:

1.  **Glory Points have exactly zero monetary value.**
2.  **You cannot buy Glory Points.** There is no store, no packs, no top-ups.
    Money never enters the game in any form.
3.  **You cannot cash out, withdraw, sell, or trade Glory Points** for real money,
    crypto, gift cards, physical goods, or anything of value.
4.  **You cannot transfer Glory Points to another user.** No peer-to-peer
    movement, so there's no informal market.
5.  **There are no prizes.** Winning earns you a leaderboard rank, cosmetic
    belts, and bragging rights. Nothing redeemable, ever.
6.  **Everyone starts every event equal.** Each new UFC/MMA event, every player
    is granted the same **1,000 fresh Glory Points** (see §3). No one can buy an
    advantage because there's nothing to buy.

> **Why this isn't gambling:** gambling legally requires (a) consideration —
> paying something of value to play, (b) chance, and (c) a prize of value. This
> game removes (a) and (c) entirely. Play is free, points cost nothing, and the
> only reward is a number on a scoreboard. With no stake in and no value out,
> it sits in the same legal bucket as a free office prediction pool or Reddit
> karma.

### A Note on the Currency Name
Currency is **Glory Points** — chosen over "tokens"/"bucks" because those *sound*
like money or crypto, which works against the not-gambling message. "Points"
reads instantly as internet points. Use it everywhere — never call them
"credits," "chips," "coins," or "currency" in the UI.

---

## 2. Monetization (Donations Only)

Revenue comes from **one thing**: an optional **Stripe donation link** —
"Support the dev / Buy me a coffee." That's it.

-   **No selling of Glory Points.** (Would make it gambling-adjacent.)
-   **No selling of services, subscriptions, badges, perks, or cosmetics.**
-   **Donating gives you nothing in-game** — not points, not a rank boost, not a
    cosmetic tag, not early access. It's a pure tip jar.

Keeping donations 100% decoupled from gameplay is the single most important
thing for staying clear of both gambling rules and Stripe's prohibited-business
policy. The moment paying money does *anything* inside the game, the clean story
gets muddy. Don't do it.

> **Implementation:** a [Stripe Payment Link](https://stripe.com/payments/payment-links)
> (no code, no backend needed) labeled "Support the Artist / Donate." Optionally
> add Ko-fi or GitHub Sponsors as alternatives. Put it in the footer and an
> "About / Support" page — not in the game flow.

---

## 3. Engagement Loop & Game Mechanics

The goal is simple: **earn the most Glory Points and brag.** The leaderboard
ranks your total; it resets each year. Points flow in three free ways plus
prediction winnings — there is no way to buy them.

*   **Free Glory Point grants (all free, zero value):**
    *   **+1,000 on signup** — one-time welcome grant.
    *   **+10 per day** — daily login bonus.
    *   **+1,000 per UFC/MMA event** — everyone gets the same allotment for each
        card, so every event is a level playing field.
*   **Make Predictions:** Players spend points to predict which **pixel fighter**
    wins each bout (start simple with just the winner; add method/round later).
    We drop our parody pixel characters into the real matchups and show the real
    fighter as a small factual tag ("as Conor McGregor") so players know what
    they're calling — **we only use the real fight's *result*** to settle.
*   **Scoring & live leaderboard:** Correct predictions pay `stake × multiplier`
    (the multiplier is the odds locked in at pick-time — see §5). Points settle
    **fight-by-fight**, so the leaderboard updates after **each bout**, not just
    at the end of the card.
*   **After the card:** once every bout on an event is settled, the final
    leaderboard is shown and **belts/badges are awarded** (virtual, zero value)
    and added to each player's **profile "trophy shelf"** for others to see.
*   **Annual Leaderboard Reset:** The leaderboard runs in **calendar-year
    seasons — 2026, 2027, 2028, …** On Jan 1, every season total resets to zero
    and a new race begins. Past seasons are archived ("2026 Champions") for
    permanent bragging rights. This keeps the board competitive for newcomers
    and gives everyone a fresh annual shot.
*   **Leaderboards:** Global season top 100, plus archived per-year champion
    lists. High ranks earn prestige-only titles shown next to usernames.
*   **Virtual Belts (top 5):** The current season's **top 5** players display a
    cosmetic **belt** next to their name — purely virtual, zero value, bragging
    rights only:
    *   🥇 #1 — 🏆 **Undisputed Champ** (gold belt)
    *   🥈 #2 — 🥈 **Interim Champ**
    *   🥉 #3 — 🥉 **#1 Contender**
    *   #4 — 🎖️ **Top Contender**
    *   #5 — 🎖️ **Ranked Contender**

    Belts are recomputed from the leaderboard, can't be bought, and reset with
    the season. Earned belts/badges are **kept on the player's profile shelf** as
    permanent history (a "20XX Champion" keepsake), even after the season resets.
*   **Participation badge:** anyone who predicts a full card earns a 🥊
    "Fought the Card" badge for that event — a collectible for the shelf.
*   **Usernames:** at signup the player picks a display name (the leaderboard
    identity). Names run through a **profanity/vile-name filter** (with leetspeak
    normalization) and offensive names are rejected.
*   **No bankruptcy possible:** the +10/day and +1,000/event grants guarantee
    nobody is ever locked out, even after a bad card.
*   **Voided bouts (scratched fights):** fights get pulled at weigh-ins. When a
    real bout is cancelled, predictions on it are **voided — the staked points are
    refunded** and the pick counts as neither a hit nor a miss (excluded from the
    share-card record). Handled client-side in demo and server-side in production.
*   **Shareable result card (growth loop):** after a card settles, the player can
    generate a pixel result image + copy text ("I went 5/6 at UFC 329, ranked #11
    🥊 — pixelknockout.com") to drop in r/MMA or a group chat. This is the cheapest
    viral loop and the main acquisition hook for the Reddit crowd.
*   **Lock countdown:** each card has a `lockTime` (the real card's start, when
    odds close). A live countdown ("Predictions lock in 6d 4h") shows the urgency;
    once it passes, picks are disabled and the card reads "Predictions closed."
*   **Country flags + fighter profiles:** every fighter shows a country flag (hover
    = country name) and an ℹ️ button opening a profile with **real facts**
    (paraphrased public info — records, nicknames, nationality) and **fun facts**
    (invented MMA-humor parody). Auto-generated fighters fall back to "Parts
    Unknown 🏴". Legal: facts aren't copyrightable, parody/humor is protected, and
    with zero commercial use this is clearly fine — just paraphrase (never copy
    Wikipedia prose) and keep jokes good-natured (no false statements of fact).

> **Design intent:** daily + per-event grants drive recurring engagement and keep
> everyone topped up; fight-by-fight settlement makes the leaderboard feel live;
> the annual reset + shelf of belts creates a long-game bragging-rights race.

---

## 4. The Heavy-Hitter Parody Roster

All characters are **transformative pixel-art parodies** — original caricatures,
not reproductions. The pixel persona (name + art + flavor) is the parody layer;
the real fighter's name appears **only as a small factual identifier** ("as Conor
McGregor") so players know which scheduled bout they're predicting. That's
**nominative fair use** — the same basis every fantasy/prediction game relies on.
**No real logos, event posters, or likeness art.**

> **Real-card mapping:** the live game maps each fighter on a real upcoming card
> to a pixel persona. The MVP ships the real **UFC 329 — McGregor vs. Holloway 2**
> main card (Jul 11, 2026) as the sample event. Famous fighters get hand-crafted
> personas (Conor → *Connor McGregarious*, Holloway → *Maxx Hollagram*, etc.);
> in production, fighters we don't have a persona for get an auto-generated pixel
> avatar + parody ring-name. Real cards are announced close to the date and change
> — so this object is rebuilt from a feed, not hard-coded long-term.

| Real Fighter (inspiration) | Parody Identity | Meme / Stylized Angle |
| :--- | :--- | :--- |
| Georges St-Pierre | **GSPee "Outangled"** | Hyper-calculated Canadian obsessed with alien geometry, riddles, and camera angles that make him look 50 lbs heavier. |
| Jon Jones | **Boney "The GOAT" Jonez** | A towering skeleton-themed champ who insists he's the Greatest Of All Pixels, throws spinning oblique kicks, and is trailed everywhere by a tiny confused goat mascot. *(Theme = his "Bones" nickname + GOAT claims. Deliberately avoids any drug/PED reference — see defamation rule in §6.)* |
| Rampage Jackson | **Tantrum Jackson** | A perpetually furious titan with an oversized plastic toy chain who body-slams everything in sight. |
| Daniel Cormier | **Daniel "Butter Chicken" Korma** | Heavy-eating, towel-grabbing champ who fights best when the post-fight buffet is mentioned. |
| Anderson Silva | **Andy "Spider" Gold** | A gravity-defying dancer who moves in slow motion until striking like a lightning bolt. |
| Demetrious Johnson | **Miniature Mouse** | Lightning-fast, pocket-sized gaming nerd whose pixel model leaves a motion-blur trail. |
| Conor McGregor | **Connor McGregarious** | Aggressively loud, silk-robe-wearing brawler swinging two giant designer suitcases of imaginary brick money. |
| Khabib Nurmagomedov | **Kabab The Bear Wrestler** | Stoic papakha-hat grappler who brings a tiny, confused pixelated bear into his corner. |
| Brock Lesnar | **The Vanilla Gorilla** | A mountain of muscle with a questionable sword-shaped torso tattoo who spins frantically when hit. |
| Israel Adesanya | **Style-Bender-Style** | Anime-obsessed striker doing hand signs mid-fight while dodging like a pixelated Matrix character. |

---

## 5. Architecture & Tech Stack

### Zero-/Low-Cost Stack
1.  **Frontend:** Static hosting on **Vercel** or **Netlify** (free tier),
    HTML/Tailwind or React.
2.  **Backend & Database:** **Supabase** (free tier comfortably handles
    thousands of users) for accounts, point balances, predictions, leaderboards.
3.  **Odds source — real, not made up:**
    *   We pull **real American odds from [The Odds API](https://the-odds-api.com)**
        (free tier = 500 requests/month; sport `mma_mixed_martial_arts`). A cron
        job (GitHub Actions or Supabase Edge Functions) caches them — once a day,
        every ~6h on fight week — so we stay well under the free limit.
    *   Real odds become the **scoring multiplier** (e.g. a −400 favorite pays
        `1.25×`; a +300 underdog pays `4.0×`). This is for **scoring fairness /
        difficulty**, never a cash payout.
    *   **Lock-at-pick-time:** odds drift daily, so the multiplier a player gets
        is **frozen to the odds at the moment they lock in their pick** — not the
        closing line. (In the current build, with no odds key set, the card uses
        clearly-labeled *placeholder* odds; add `ODDS_API_KEY` in `config.js` to
        go live.)

### Authentication — Recommendation

You asked about email login, "sign in with Google," whether Auth0 is free, etc.
Here's the rundown:

| Option | Free? | Verdict |
| :--- | :--- | :--- |
| **Supabase Auth** *(recommended)* | **Yes**, included free with Supabase | If you're already on Supabase for the DB, its built-in Auth gives you email/password **and** social logins (Google, GitHub, etc.) out of the box, no extra service or bill. One vendor, one SDK. **Use this.** |
| Firebase Auth | Yes, generous free tier | Great if you'd rather use Firebase as the whole backend. Same idea as Supabase Auth. |
| Auth0 | Free tier exists (~25k monthly active users), but **adds a 3rd-party service** and gets pricey/complex past the free tier | Overkill here. Don't bother unless you outgrow Supabase Auth. |
| "Sign in with Google/Microsoft" directly | Free (it's just an OAuth provider) | You still need something to *manage sessions and user records* — that's what Supabase/Firebase Auth does. They wire Google/MS sign-in in for you, so you don't integrate OAuth by hand. |

**Bottom line:** Use **Supabase Auth**. Enable **email magic-link/password +
"Sign in with Google"** (one config toggle). It's free, it's one less vendor,
and it stores your users right next to their point balances. Skip Auth0.

### Account Data Model (sketch)
- `users` — id, email, display name, created_at, prestige title.
- `point_balances` — user_id, season (e.g. 2026), event_id, points_remaining.
- `predictions` — user_id, event_id, fight_id, picked_fighter, points_staked,
  resolved, points_won.
- `seasons` — year, status (active/archived), champion snapshot.

---

## 6. Legal Compliance Review & Operational Risks

### 1. Trademark & Right of Publicity
*   **Risk:** Real fighters own their names/likenesses; promotions own their logos.
*   **Solution:** Keep art highly stylized/caricatured (not exact reproductions),
    use only parody names (*GSPee "Outangled"*, etc.), and frame everything as
    16-bit arcade parody. **Never** use real corporate logos (UFC letters,
    official posters, event branding) or a fighter's actual name as the displayed
    identity. Add a visible disclaimer: *"A work of parody/satire. Not affiliated
    with, endorsed by, or connected to any real fighter, promotion, or
    organization."*

### 1b. Defamation / Derogatory Naming (parody fun-facts)
*   **Risk:** A joke that reads as a *false statement of fact* harming a real
    person's reputation can be defamation (libel). The riskiest category is
    **accusations of crimes or drug/PED use.**
*   **Rule:** Fun-facts must be **obvious opinion/absurdist parody, never a
    factual claim** — and we **avoid drug/PED, criminal, and personal-conduct
    angles entirely**, even when based on real events. Keep it good-natured.
    *   ✅ Good: "claims to be the Greatest Of All Pixels," "trailed by a confused
        goat," "bills opponents for emotional damage."
    *   🚫 Avoid: anything implying a real fighter is a drug user, cheat, or
        criminal (e.g. the old "banned science / trace elements" Jon Jones gag was
        cut for this reason).
*   **Identification is allowed:** we display *"as <real fighter>"* as a factual
    tag (nominative fair use), so parody names don't need to be obvious — players
    can always tell who's who without us using the real name as the identity.

### 2. Gambling / Payment Processing
*   **Risk:** Stripe bans gambling businesses; regulators care about money-in /
    value-out.
*   **Solution:** Already structurally handled by §1 and §2 — **no money buys
    points, no points convert to value, donations do nothing in-game.** Reinforce
    in copy:
    *   Never use "buy chips," "token store," "wager," "bet," "stake real,"
        "cash out," or "odds payout in $" anywhere in the UI.
    *   The Stripe link is labeled strictly **"Support the Dev / Donate"** and
        lives outside the game flow.
    *   Point balances change **only** through gameplay (per-event grant, winning
        predictions) — never through a transaction.

### 3. Minors / Terms
*   Add a basic **Terms of Service + Privacy Policy** (free generators are fine to
    start). State it's a free game with no real-money element.
*   Even though there's no gambling, consider a "13+" (or "18+" to be safe)
    sign-up note, since the theme is combat sports and the audience is r/MMA.

---

## 7. Suggested Build Order (MVP first)
1.  Buy domain + set up Supabase project (DB + Auth with Google sign-in).
2.  Static frontend on Vercel; hard-code one upcoming event card.
3.  Per-event 1,000-point grant + simple "pick the winner" prediction flow.
4.  Manual result entry → scoring → season leaderboard (top 100).
5.  Add the parody roster art + flavor.
6.  Automate odds pull (The Odds API) for scoring multipliers.
7.  Add annual reset job (archive season on Jan 1).
8.  Add Stripe donation link + About/Support page + ToS/Privacy + disclaimer.
