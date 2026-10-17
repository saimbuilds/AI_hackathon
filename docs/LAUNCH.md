# Fold: launch, cost and scaling playbook

We are not demoing a prototype. **We are launching a product during the hackathon**, and real people will use it from about H8.
This file covers what must be true before we post the link, what it costs as people use it, and what changes as it grows.

---

## 1. Pre-flight: must be true before the link goes public (~45 min block)

| # | Item | Why | How |
|---|---|---|---|
| 1 | **Sign-in that works for strangers** | Supabase's built-in email only delivers to your own team, about 2 emails/hour, so magic links would silently fail for real users | Anonymous auth first, then **Google sign-in** (no email needed). Magic links only after custom SMTP is set up |
| 2 | **Edition job queue + concurrency cap** | 40 people opening the link at once = 40 parallel AI calls, and Groq's free tier allows ~30/min | A Postgres jobs table (or Supabase Queues/pgmq) with a worker capped at ~5 concurrent builds. **The printing-press animation is the queue UI**: waiting feels like printing |
| 3 | **AI-optional edition** | Providers will 429 at the worst moment | If every provider fails, build from ranking + pre-written story briefs + template copy ("why this" from matched topics). The paper always prints |
| 4 | **Budget guard** | A free-tier quota or a paid bill must not blow up | Count calls/tokens per provider per day in Postgres; hard daily cap; when hit, switch to the AI-optional path; show on the admin page |
| 5 | **Rate limits + bot check** | Bots, double-clicks, people spamming "regenerate" | Cloudflare Turnstile (free) on onboarding; per-IP and per-user limits (e.g. 3 rebuilds/day) |
| 6 | **Error tracking + analytics + uptime** | You must see problems before users tell you | Sentry (free tier), PostHog (track ~10 key events only, see §4), a free uptime monitor |
| 7 | **Trust + legal basics** | Strangers' data, global users, EU visitors | Privacy page, Terms, **"Delete my paper & data"** button, analytics consent or cookieless mode, unsubscribe link in every email |
| 8 | **"Report a problem" on every story** | AI summaries *will* sometimes be wrong; catch it publicly and fast | One-tap: wrong facts / broken link / not for me → admin queue |
| 9 | **Admin page** (`/newsroom`) | Run the launch from one screen | Users, editions built, queue depth, errors, AI calls by provider, budget used, latest feedback |
| 10 | **Events logged from minute one** | Learning needs history; real users' behavior is gold | The reader logs impressions, opens, dwell, skips and clicks to `events` from the first deploy. Learning updates can be applied later, retroactively |
| 11 | **Load test** | Find the bottleneck before the crowd does | Script 30 concurrent onboardings against production; the queue must drain in under 2 min |
| 12 | **Fresh content** | A stale paper on launch day kills the first impression | The news job ran within the last 3 h; check `/newsroom` |
| 13 | **Real phone check** | Most people will open the link on a phone | Test Stories mode and the PDF on an actual phone, on mobile data |

---

## 2. Launch sequence (from about H8)

1. **Soft launch (15 min):** 5 friends. Watch Sentry + `/newsroom` live. Fix anything that breaks.
2. **Hackathon crowd:** the participants' group or Discord, organizers, mentors. They are a captive audience with phones. QR code on your laptop lid.
3. **Your network:** WhatsApp status/Instagram story ("I built you a newspaper. Yours in 90 seconds"), plus a LinkedIn/X post with a 30-second screen recording. The sponsor's team may see it too.
4. **Loops built into the product (they do the rest):**
   - **Masthead share card:** "I have my own newspaper now: *The Sara Chronicle*". Seeing your name in a newspaper masthead is the most shareable moment we have.
   - **Gift link:** "Make one for someone": every gift is a second user.
   - **Daily 3 grid** to WhatsApp.
5. **Iterate in public:** a parallel Claude Code "launch desk" session watches errors and feedback and ships hotfixes. Post "v1.1: fixed X, added Y, based on your feedback" at about H10. **The commit history will show a live product responding to users**, which no other team will have.

**Truthfulness rule:** the Loom and README show *exactly* the numbers PostHog shows, even if small. 25 real papers beats every team's zero.

---

## 3. What it costs as people use it

### 3.1 Two kinds of cost
1. **Shared cost (doesn't grow with users):** reading, clustering and writing up each news story **once**. It grows with sources/regions/languages, not readers.
2. **Per-reader cost:** one "editor" AI call per reader per day, the email, the PDF if downloaded, storage and analytics.

### 3.2 Pricing basis (verify at signup; prices move)
- Current Flash-Lite-class model: about **$0.25 per 1M input tokens and $1.50 per 1M output tokens** (Gemini 3.1 Flash-Lite, Sept 2026 listing). Older or smaller models are ~$0.10 / $0.40.
- Batch APIs (overnight editions don't need to be instant) and **prompt caching** cut this further. Every reader in a region shares the same story pool, so that part of the prompt is cached.

### 3.3 Per-reader, per-day math
| Item | Assumption | Cost/day | Cost/month |
|---|---|---|---|
| Editor call | ~4K tokens in (story pool + profile), ~1K out (why-this, For-you, note, quiz) | ≈ $0.0025 | ≈ $0.075 |
| Same, at scale | batch (−50%) + cached shared prefix | ≈ $0.001 | ≈ $0.03 |
| Daily email | Resend paid ≈ $0.90 per 1K → Amazon SES ≈ $0.10 per 1K at scale | $0.0009 → $0.0001 | $0.027 → $0.003 |
| PDF | rendered only when downloaded (~30% of days) | ≈ $0.0002 | ≈ $0.005 |
| Database/storage | edition = story IDs + per-reader text (~3–5 KB), not copies of stories | — | ≈ $0.01 |
| Analytics | ~10 key events/day only | — | ≈ $0.01–0.02 |
| **Total per active reader** | | | **≈ $0.10–0.15 at launch → ≈ $0.05 at scale** |
| Gift edition with translation | +~3K output tokens/day on a stronger multilingual model | | +≈ $0.15–0.25 (priced at $5/mo, fine) |
| Audio (Plus) | kokoro-js runs on the reader's device | | **$0** |

**Shared enrichment:** ~500 stories/day ≈ $20/month; a global catalog of ~5,000 stories/day ≈ $100–200/month. That's flat no matter how many readers.

**The economics in one line:** a free reader costs about 10–15¢/month. At 4% converting to $4/month, each reader brings about 16¢/month in revenue, before gifts and Teams. **Free users pay for themselves from day one at modest conversion.** That is the difference from Artifact's cost structure.

> ⚠️ Analytics trap: tracking every scroll/impression event (~50/user/day) on a paid analytics plan can cost **more than the AI**. Track key funnel events in PostHog; keep learning signals in our own `events` table.

---

## 4. What changes as it grows

| Stage | Daily readers | What breaks first | What we change | Monthly cost (rough) |
|---|---|---|---|---|
| **Hackathon** | ≤ 100 | Groq ~30 req/min bursts; Supabase built-in email (team-only); Resend free 100 emails/day | Queue + AI-optional fallback; Google sign-in; Gmail SMTP or Resend with a verified domain | **$0** (+ ~$10 for a domain, optional) |
| **Launch** | 100–1K | Free AI daily caps; **Vercel Hobby is non-commercial**, so it's out once we charge; Supabase free 500 MB DB / 1 GB storage | Pay-as-you-go AI (one main provider + one fallback); Vercel Pro $20; Supabase Pro $25; Resend Pro; payments via Lemon Squeezy or Paddle | ≈ $70 fixed + ~$0.12/reader → **≈ $100–200** |
| **Traction** | ~10K | The 7 AM spike (everyone's paper at once); PDF cold starts; analytics bill | Editions built ahead of time in **time-zone batches**; Batch API + prompt caching; a small dedicated PDF worker; SES for email; sampled analytics | **≈ $1–1.5K** |
| **Scale** | ~100K | AI bill dominates; DB size (events, editions) | Route by cost per task; **self-host an open model** for story enrichment on a rented GPU when cheaper than per-token pricing; prune/partition events; read replica; CDN for shared story content | **≈ $6–10K** (~$0.06–0.10/reader) |
| **Big** | ~1M | Everything at volume | **Fine-tune a small "editor" model** on the big model's outputs (distillation); per-region story pools; dedicated infra | **≈ $40–70K** (~$0.04–0.07/reader) |

**What does NOT change:** it stays one app + one news job + one PDF worker. No microservices. The core rule never changes either: stories are done once and personalization is cheap (system-architecture skill).

### Revenue check at each stage (illustrative: 40% of monthly users read daily, 4% pay $4/mo)
| Daily readers | Monthly users | Paying | Fold+ revenue/mo | Cost/mo |
|---|---|---|---|---|
| 1K | 2.5K | 100 | $400 | ~$150 |
| 10K | 25K | 1,000 | $4,000 | ~$1.2K |
| 100K | 250K | 10,000 | $40,000 | ~$8K |
| 1M | 2.5M | 100,000 | $400,000 | ~$55K |

Gifts and Teams are on top of this. Gross margin lands around 80–90%. These are targets to beat, not market data.

---

## 5. Free-tier gotchas (verified Oct 2026; re-check at signup)
- **Supabase auth email:** the built-in sender only reaches your team, ~2/hour. Add custom SMTP (raises the default to ~30/hour, adjustable), or use Google sign-in.
- **Resend free:** 3,000/month, **100/day**, needs a **verified domain** to email strangers.
- **Vercel Hobby:** personal, **non-commercial** use only. Payments or ads mean you need Pro.
- **Groq free:** ~30 req/min; daily request *and token* caps per model. Tokens run out first.
- **Gemini free:** limits changed repeatedly in 2026; never the only provider.
- **GitHub Actions:** unlimited minutes only while the repo is **public**.
- **Supabase free:** 500 MB DB, 1 GB storage, pauses after a week of inactivity. Prune article text after 14 days; don't store every PDF forever (render on download, cache 7 days).
- **Google News RSS links are redirects.** Fine for click-through; don't try to scrape them.
- **Payments from Pakistan:** Stripe doesn't onboard Pakistan-based businesses. **Lemon Squeezy** (bank/PayPal payouts) and **Paddle** (wire/Payoneer) reportedly do. Both are merchants of record, so they handle global VAT/sales tax, which matters for a worldwide SaaS. Verify the country list at signup. For the hackathon: no real payments, just a fake door + waitlist.

---

## 6. Data, privacy and publishers
- **We store:** profile (name, city, interests), editions, reading events, email. **Not stored:** anything sensitive, payment data (the merchant of record holds it).
- **Retention:** raw events 90 days, then aggregated; article full text 14 days; editions kept (they're the user's archive).
- **User rights:** export and delete from settings. EU visitors get analytics consent (or cookieless analytics).
- **Publishers:** we use RSS (published *for* syndication), show summaries across multiple outlets with attribution, **never republish full articles**, always link out, and honor takedown requests (contact in footer). Later: a publisher program with revenue share on referred subscriptions.

---

## 7. The 30 days after the hackathon
| Week | Goal |
|---|---|
| 1 | Fix everything users reported. Daily 7 AM emails running. Talk to 10 users on calls ("what did you do with today's paper?") |
| 2 | Public launch: Product Hunt + Show HN + build-in-public thread. Custom domain + email deliverability (SPF/DKIM/DMARC, one-click unsubscribe) |
| 3 | **Bring your own sources** (newsletters via RSS + a personal inbound email address) = the first Fold+ feature. Payments live via Lemon Squeezy or Paddle |
| 4 | Read the numbers against the kill criteria in STRATEGY.md and pick the wedge that the data supports |
