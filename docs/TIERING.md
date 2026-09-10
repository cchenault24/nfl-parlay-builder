# ParlAId — Free / Pro Tiering Spec

Status: **design agreed, pending two decisions** (price confirmation, App Store validation).
Last updated: 2026-09-10.

---

## 1. Understanding

- **What:** A two-tier model for ParlAId — Free ($0) and Pro ($4.99/mo).
- **Why:** Real revenue, not cost recovery. Every generation costs an OpenAI
  `gpt-5.6-terra` call plus Odds API credits, so volume must be metered somewhere.
- **Lever:** Volume *and* depth. Free is a genuine taste of the product; Pro adds
  unlimited volume plus the capabilities that cost more to serve.
- **Who:** NFL fans using AI-generated parlays for entertainment. 18+, no wagering
  on-platform.
- **Free floor (non-negotiable):** browsing games/odds/stats, some real parlay
  generations, and full iOS access.
- **Non-goals:** anonymous generation, ads, a season pass, per-generation credits.

### Positioning

**Free proves it's real. Pro makes it fun.**

Free ships only legs anchored to a posted book line — no AI-invented numbers
anywhere. The longshots, the risk dial, the props, and your own sportsbook all
live behind $4.99.

Because Free's parlay is close to deterministic (see §6), the free experience must
lead with the **analysis** — matchup summary, key factors, projected score, win
probability, per-leg reasoning — and present the three legs as its conclusion.
Pro is then "act on this however you want," not merely "more legs."

---

## 2. Tier table

**Free $0 · Pro $4.99/mo**

| Feature | Free | Pro | Tier |
|---|---|---|---|
| **Access** ||||
| Sign in (Google + email) | yes | yes | Both |
| Age gate + legal disclaimers | yes | yes | Both |
| Browse schedule / week picker | yes | yes | Both |
| Team stats + league ranks | yes | yes | Both |
| Posted book lines on game cards | yes | yes | Both |
| Web + iOS app | yes | yes | Both |
| **Generation** ||||
| Parlay generations | 2 / week, resets Tuesday | Unlimited [1] | Tiered |
| Re-rolls | none — a re-roll spends one of the 2 | Unlimited | Tiered |
| Risk level | moderate only (shown locked) | conservative / moderate / aggressive | Tiered |
| Leg count | 3 — one per market [2] | 2–6 | Tiered |
| Live agent timeline (SSE) | yes | yes | Both |
| Priority queue under load | — | yes | Pro |
| **Odds & markets** ||||
| Spread / total / moneyline | yes, anchored | yes, anchored | Both |
| Player props | — | yes | Pro |
| Every leg anchored to a real book line | always | market legs always [3] | Tiered |
| Sportsbook | locked to default book | user picks their book | Tiered |
| Cross-game parlays | — | yes | Pro |
| Full-slate mode (whole week) | — | yes | Pro |
| **Analysis** ||||
| Per-leg confidence + reasoning | yes | yes | Both |
| Game summary + key factors | yes | yes | Both |
| Projected score + win probability | yes | yes | Both |
| Legs the agent rejected, and why | — | yes | Pro |
| **History & results** ||||
| Save a parlay | yes | yes | Both |
| History depth | last 10, rolling | unlimited, all seasons | Tiered |
| Post-game grading | yes | yes | Both |
| Performance record (win rate, ROI, by risk/market/team) | — | yes | Pro |
| Line-move alerts on saved parlays | — | yes | Pro |
| Export / shareable result card | — | yes | Pro |
| **Billing** ||||
| Stripe (web) / Apple IAP (iOS) | — | yes | Pro |

[1] Silent 20/hr fair-use valve. Never surfaced as a quota; no counter in the UI.
[2] Not a cap. `validate` permits at most one leg per market and a single game has
    exactly three (spread, total, moneyline). Props are what make 2–6 possible.
[3] Pro props are AI-estimated at launch; anchoring them needs the Odds API paid
    plan with `player_*` markets. See §5.

---

## 3. Rules the table does not capture

### Quota accounting (Free only)

A generation decrements the weekly quota **only** when the run reaches
`succeeded` **and** `sources.odds === 'ok'`.

Everything else is free to the user: failed runs, canceled runs, runs stuck in
`running`, and successful runs that fell back to AI-estimated prices because the
odds tool was unavailable. Measured failure rate is **13%** (§7) — without this
rule a free user loses a parlay to failure roughly monthly, and a degraded run
delivers AI-estimated legs, which is precisely what Free is defined as not doing.

### Quota window

Weekly bucket resetting **Tuesday**, aligned to the NFL week (Tue–Mon). A rolling
7-day window locks a Sunday user out the following Sunday.

### Downgrade / cancellation

Retain all data, restrict the view, restore on resubscribe. Never delete a saved
parlay. Pro-generated 6-leg prop parlays continue to render for a lapsed user;
they simply cannot generate new ones.

### Locked-control upsell

Free must render the risk selector and sportsbook picker **visible but disabled,
with a Pro badge**, on the results screen — beside a parlay the user already
likes. This is the primary conversion mechanism, not polish, and it is v1 scope.
An exhausted-quota empty state is a frustration moment; a good parlay the user
wants to tweak is a desire moment.

### Entitlements model

Model entitlements as **per-feature budgets, not a single `isPro` boolean.**
Full-slate mode generates ~16 runs per click and re-rolling a slate multiplies
that; it will need its own sub-budget in v3. Designing for that now avoids an
entitlement refactor later.

---

## 4. Unit economics

Net revenue per Pro user:

| Channel | Gross | Net |
|---|---|---|
| Stripe (web) | $4.99 | ~$4.55 |
| Apple IAP @ 15% | $4.99 | ~$4.24 |

Measured token usage per run (§7): ~1,371 input / 757 output (mean);
1,398 / 1,784 at p95.

Cost per run, by model rate — **the actual `gpt-5.6-terra` rate is unconfirmed**:

| $/Mtok (in / out) | Mean run | p95 run | Break-even runs/mo @ $4.24 |
|---|---|---|---|
| $0.15 / $0.60 | $0.0007 | $0.0013 | ~6,000 |
| $1.25 / $10 | $0.009 | $0.020 | ~470 |
| $2.50 / $10 | $0.011 | $0.022 | ~385 |
| $3 / $15 | $0.016 | $0.031 | ~265 |
| $10 / $30 | $0.036 | $0.068 | ~118 |

**Conclusion: uncapped Pro is safe at any non-premium rate.** A heavy user at
50 runs/week (215/mo) costs $1.94/mo against $4.24 net at $1.25/$10. Weekly
full-slate adds only ~69 runs/mo. Uncapped only breaks at premium pricing
($10/$30) combined with heavy usage.

Latency reinforces this: a draft takes 19s (p50) to 39s (p95), so "unlimited" is
substantially self-enforcing. Nobody watches 300 timelines a month.

Odds API costs amortize well — 23 odds fetches served 83 runs via the existing
cache and request collapsing.

---

## 5. Build order

**v1 — shippable Pro**
Stripe + Apple IAP + entitlements · weekly quota with the §3 accounting rule ·
risk-level lock · props gate (prompt constraint + validation rule) ·
history depth filter · sportsbook picker · locked-control upsell UI.

The props gate and risk lock are near-free. The sportsbook picker is the only
substantial v1 build, and its real work is threading the chosen book consistently
through `tool:odds` → prompt → `validate`, since validation demands an exact
line-and-price match. It also needs a disclosed fallback for when the chosen book
has not posted a line for that game.

**v2** — anchored player props (Odds API paid plan) · performance record ·
rejected-legs view.

**v3** — cross-game parlays · full-slate mode · line-move alerts · export ·
priority queue.

Note on sequencing: until v2, Pro props carry an AI-estimated line, so the only
users who ever see the "AI estimate" disclaimer are paying ones. Make the Pro
props UI explicit about which legs are anchored — that honesty is what makes the
v2 upgrade land as a genuine win rather than a fix.

---

## 6. Known weaknesses

**Free's parlay is close to deterministic.** One game, moderate risk, one leg per
market, three markets — eight possible parlays per game, and the edge rule
(confidence must beat the price's break-even) collapses it further toward a single
best answer. Re-running the same game would produce roughly the same three legs.
Mitigation is the positioning in §1: Free's value is the analysis, not parlay
variety. "2 per week" should be read as "2 games per week," not "2 tries."

**The free-to-Pro gap is large for $4.99.** Pro carries unlimited generation, the
whole props system, all risk levels, 2–6 legs, book choice, full history, and
analytics. Comparable sports-analytics subscriptions run $10–30/mo. See §8.

**Monthly billing on a seasonal product.** An NFL app collects for roughly five
months and churns in February — about $21 net per user per year, not $51. A
season pass was considered and declined; do not model this at 12 months.

**App Store approval is an unvalidated dependency.** The entire iOS half of the
plan assumes an app generating AI betting picks clears review. Validate before
building the v1 billing path.

---

## 7. Measured data

Source: `agentRuns` from local development runs, 2026-09-10, captured before the
dev Firebase project was retired. Local dev calls the live OpenAI API with the
production prompt builder and model, so token counts are representative. The prod project has no `agentRuns` — the deployed agent has not
been exercised (prod holds 5 users and 6 saved parlays).

```
total agentRuns: 83
by status:       succeeded 67 · failed 11 · canceled 2 · running 3
draft steps with tokens: 73

input tokens   mean 1371  p50 1389  p90 1398  p95 1398  max 2037
output tokens  mean  757  p50  593  p90 1316  p95 1784  max 2250
draft latency  mean 21.1s p50 19.0s p90 32.7s p95 38.7s max 38.7s
```

Observations:
- Input is remarkably stable (p50→p95 varies by 9 tokens); output carries all the
  variance, driven by leg count and reasoning length.
- **13% failure rate** (11 failed + 2 canceled of 83) — drives the §3 quota rule.
- **3 runs stuck in `running`** with no terminal state. This is a bug, and it will
  corrupt any quota accounting keyed on run status. Fix before building quotas.

Reproduce: query `agentRuns/{id}/steps` for `type == 'draft'`, read
`tokensInput` / `tokensOutput`.

---

## 8. Decision log

| Decision | Alternatives considered | Why |
|---|---|---|
| Two tiers, Free + Pro | Trial-only; usage credits | A free floor is required for discovery; credits add billing complexity for a $5 product |
| Volume + depth gating | Volume only; depth only | Depth-only leaves OpenAI spend unbounded; volume-only makes Pro a meter rather than a better product |
| $4.99/mo | $9.99/mo; season pass; both | Impulse price for an entertainment app; thinner margin accepted |
| Free = 2/week, Tuesday reset, no re-rolls | 3/week; 1/week; rolling window | A demo, not a product; Tuesday aligns the bucket to the NFL week |
| Free = moderate risk only | All risk levels free | Two runs cannot explore a three-way axis; zero marginal cost to gate; leg count partly substitutes |
| Free = no player props | Props with AI-estimated lines free | Forces 3 anchored legs by construction; removes AI-invented numbers from Free entirely; sharpens Pro's best hook |
| Leg count 3 free / 2–6 Pro | 2–6 both tiers; an arbitrary free cap | Falls out of the one-leg-per-market rule — no arbitrary number to defend |
| Grading, reasoning and summary stay free | Gate them to Pro | Grading is the proof the product works; reasoning is what separates this from a random generator |
| Free history = last 10 rolling | Current week only | A current-week window ages out a graded result ~1 day after grading, destroying the proof that justified keeping grading free |
| Free pinned to one book | Best-price-across-books as the Pro feature | "Price it on my book" is a felt need; also tracks real Odds API cost |
| Pro uncapped + silent 20/hr valve | 20/week; 10/day; 5/day | Strongest marketing claim, least code; valve bounds the tail; §4 confirms it is affordable |
| Quota decrements only on success + `odds === 'ok'` | Decrement on run start | 13% measured failure rate; a degraded run does not deliver Free's stated product |
| Entitlements as per-feature budgets | Single `isPro` boolean | Full-slate (~16 runs/click) will need its own sub-budget in v3 |

---

## 9. Open items

| Item | Owner action | Blocks |
|---|---|---|
| Confirm `gpt-5.6-terra` rate | Read the OpenAI dashboard, drop it into §4 | Final sign-off on uncapped Pro |
| Re-decide price against the final tier gap | $4.99 vs $9.99 | v1 billing |
| Validate App Store approval for AI betting picks | Ask Apple before building | v1 iOS billing |
| Fix runs stuck in `running` | Add a terminal-state timeout | Quota accounting |
| Steer web signups to Stripe over IAP | ~$0.30/user/mo | — |
