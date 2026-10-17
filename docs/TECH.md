# Fold: technical deep dive

> Companion to [BATTLE_PLAN.md](BATTLE_PLAN.md) (what/when), [STRATEGY.md](STRATEGY.md) (why/market) and [LAUNCH.md](LAUNCH.md) (launch/cost).
> This file covers **how it works**, **which AI does what**, **how sourcing stands out**, **the network**, and **whether 50 users fit in free tiers**.

---

## 1. How Fold works, in plain words

Think of Fold as **a newsroom that works for one person.**

1. **The press (every 3 hours, automatic).** A robot reads thousands of articles from around the world, in many languages.
   - It notices when 12 articles are about the same event and turns them into **one story**.
   - It writes a short, sourced summary of each story **once**. Every sentence points to the article it came from.
2. **Joining (90 seconds).** You name your paper, describe your mornings in one sentence (or say it aloud), and swipe 12 real headlines. That gives Fold your **taste profile**.
3. **The editor (every morning, and right after you join).** From today's pile of stories, an AI editor:
   - picks about 10 for you and lays out the front page
   - adds a line on what each one **means for you**
   - writes a short note to you, then "prints" your paper as a web page and a PDF
4. **Reading.** You read, skip, tap "more" or "less". Every action teaches Fold, so tomorrow's paper is better.
5. **The ending.** "You're all caught up." Then 3 things you learned, today's Daily 3 quiz and your streak. You share it, and come back tomorrow at 7.

Everything expensive (reading and writing stories) happens **once for everyone**. Everything personal is cheap math plus **one** small AI call per reader per day.

---

## 2. The AI, step by step

| # | Step | What happens | Tech |
|---|---|---|---|
| 1 | **Collect** | ~150–300 feeds + primary sources + discussion sites + your own sources (§4) | Feed parsers, Readability for full text |
| 2 | **Understand** | Turn each article's title and opening into a 384-number "meaning fingerprint". **Works across 100 languages**, so an Urdu, Arabic and English article about the same event land next to each other | `multilingual-e5-small` (open, MIT) run locally in the worker |
| 3 | **Group** | Articles whose fingerprints are close (cosine ≥ ~0.82 within 48 h) become one story. Close to a story from 2–7 days ago? It's "Developing · Day N" | pgvector in Postgres |
| 4 | **Rank globally** | Importance = outlets covering it + how fast coverage grows + primary-source flag + an AI 1–10 rating | SQL + enrichment |
| 5 | **Write once** | For each story: neutral headline, dek, 3-paragraph brief, why it matters, topics, entities, a "distress" level (for Calm mode), "what we don't know yet", a quiz question. **Every sentence carries the IDs of the articles it came from** | Mistral Small (open, Apache-2.0) |
| 6 | **Fact-check itself** | A second, cheap model checks every sentence against its cited excerpts and **drops anything unsupported**. We report the % that passed (the "grounding rate") | Llama 3.1 8B (open) |
| 7 | **Personal ranking** | The reader's taste fingerprint vs. each story + topic preferences + "readers like you finished this" + freshness. Then diversify (MMR) and add 1–2 exploration picks (Off Your Beat) | Vector math in Postgres, no AI call |
| 8 | **Edit for one person** | One call per reader per day: front-page choice, personalized section names, a "For you" line per story (only if there's a real link), editor's note, 3 things, a personal quiz, "Tomorrow in your paper" | `gpt-oss-120b` (open, Apache-2.0) |
| 9 | **Print** | The same edition rendered as the web reader and a typeset PDF with QR codes | Headless Chromium |
| 10 | **Learn** | Reading signals update the taste fingerprints (fast and slow) and topic preferences. A nightly memo describes the reader in plain English, and the reader can edit it | Rocchio vectors + Beta bandit + small LLM |
| 11 | **Prove** | Learning Lab (simulated readers), grounding rate, cost per edition: three numbers on screen | Evals (§8) |

**Simplification:** *all* embedding happens in the worker. The web app never runs an AI model to make fingerprints; it only does vector math in Postgres.
- A new reader's starting profile comes from the stories they swiped (already fingerprinted) plus their parsed topics mapped to precomputed topic fingerprints.
- Result: no embedding API, no cold-start model downloads, no rate limits on that path.

**Guardrails**
- Article text is untrusted data: it's wrapped in delimiters, read into fixed JSON shapes, and never given tools.
- The editor may **select and frame, never change facts**.
- No financial or medical advice in "For you" lines.
- **We never generate news images.** Real photos only, with a consistent halftone treatment.

---

## 3. The open-model stack

The principle: **open-weight models first, closed models only as fallback.**
- We call them through free inference providers today, so there are no GPUs and no cost for the hackathon.
- Because every model is open-weight, **we can self-host the same models later** (see LAUNCH.md §4). The cost curve belongs to us, not a vendor. Investors care about that.

| Job | Open model | License | Served by (free) | Fallback |
|---|---|---|---|---|
| Meaning fingerprints | **multilingual-e5-small** (384-d, ~100 languages) | MIT | Runs locally in the worker (transformers.js) | — |
| Story write-ups (bulk) | **Mistral Small 3.x** | Apache-2.0 | Mistral free plan | gpt-oss-20b on Groq → OpenRouter |
| Fact-check pass | **Llama 3.1 8B Instant** | Llama license | Groq | Mistral Small |
| Onboarding parse | **gpt-oss-20b** | Apache-2.0 | Groq | Llama 3.1 8B → Gemini Flash-Lite |
| Per-reader editor | **gpt-oss-120b** | Apache-2.0 | Groq | Mistral Small → OpenRouter ($5 prepaid) |
| Translation (gift papers) | **Qwen3-32B** (119 languages incl. Urdu) | Apache-2.0 | Groq | Gemini Flash (closed) |
| Voice onboarding ("say it in any language") | **Whisper large-v3-turbo** | MIT | Groq | Browser Web Speech |
| Audio edition | **Kokoro-82M** | Apache-2.0 | In the reader's browser (kokoro-js) | Browser Web Speech |
| Simulated readers (Learning Lab) | gpt-oss-20b | Apache-2.0 | Groq / Mistral | — |

⚠️ Provider model IDs and free limits change. **Check each console's model list at H0** and keep IDs in one config file (`lib/models.ts`).
Avoid NLLB for translation: its licence is non-commercial.

---

## 4. Sourcing: how we stand out

Every other team will call NewsAPI, or at best the same handful of RSS feeds. **Their sourcing is a list. Ours is a source graph that grows.**

| Layer | What | Why it stands out | Hackathon? |
|---|---|---|---|
| 1. **Story clustering** | Many outlets → one story, "Confirmed by 6 outlets" | Feels edited, not aggregated | **MUST** |
| 2. **Primary sources: the origin, not the echo** | Central banks, regulators, courts, government press releases, company blogs, GitHub releases, arXiv, sports federations | You get the news *before* the news: the OpenAI blog post or the central-bank statement itself, next to the coverage | **MUST** (just catalog curation, ~20 min) |
| 3. **World press, cross-language** | Non-English outlets (BBC Urdu/Hindi/Arabic, Al Jazeera Arabic, DW, El País, NHK…) cluster *with* English coverage thanks to multilingual fingerprints | **"How the world covered it":** the same story from Karachi, Delhi, Doha, Berlin, Washington, each with a translated one-liner. Ground News shows left/right; we show the planet | **SHOULD** (the model choice is free now; UI ~45 min) |
| 4. **The source scout (agentic)** | A reader types a niche ("Formula E", "Rust compilers", "Kenyan fintech"). An AI scout searches Google News for that beat, collects the domains that cover it, finds their RSS feeds automatically, checks they're alive and recent, has an LLM vet them, then **adds them to the catalog for everyone** | **The catalog grows itself:** each new reader's niche makes the paper better for every future reader with that interest. This is a *data network effect* | **SHOULD** (~1 h; runs as a GitHub Actions job triggered from the app) |
| 5. **The conversation** | Hacker News and Reddit discussion for each story: "What people are saying: top pushback in one line" | The article plus the reaction | Stretch |
| 6. **Your own sources** | Paste any Substack/Beehiiv/Ghost/blog URL (they all have RSS). Later: a personal inbound address for newsletters | Solves "newsletters" from the brief; the first paid feature | Stretch (paste-URL is ~20 min) |
| 7. **Life data** | Weather (Open-Meteo), On this day (Wikimedia), markets/FX, optional prayer times, fixtures/scores | Makes it feel like a *real* newspaper, with ears and boxes | **MUST** for weather + On this day |

ScrapeGraph (your `just-scrape` skill) is the escape hatch for important sites with no RSS. Use it sparingly; it costs credits.

---

## 5. Trust: every sentence has a receipt

- Enrichment writes the brief as a list of sentences, each tagged with source IDs.
- The fact-check pass verifies each sentence against the cited excerpts and drops unsupported ones.
- The reader shows newspaper-style superscript citations `¹ ²` that open the source.
- Stories show "Confirmed by N outlets" or **"Single source"**, plus "What we don't know yet" for developing stories.
- **On screen in the Loom:** "Grounding rate today: 97% of sentences verified against sources." Hardly any team will measure hallucination; we show the number.

---

## 6. Personalization in one paragraph

Each reader has:
- a **slow** taste fingerprint (who you are)
- a **fast** one (what you're into this week)
- per-topic preference scores (Beta distributions)
- a plain-English memo

Stories are scored by:
- similarity to your fingerprint
- your topic preference
- global importance
- freshness
- outlet count
- a small **"readers like you finished this"** boost, from stories co-read by readers with similar fingerprints

Then we diversify the picks, add one or two deliberate surprises, and the editor model lays it out. Every read, skip, "more", "less" (with a reason) and quiz answer nudges the fingerprints and preferences.
Details and weights: BATTLE_PLAN.md §4.5–4.6.

---

## 7. Making it a network: my take

**Yes to network *effects*. No to a social network *product* in 12 hours.**
- A friends feed with 50 users is empty. Social features need density, moderation and privacy work.
- They'd also turn Fold back into a feed, which is the thing we're against.

Build the network in three layers that already work with tiny numbers of users:

| Layer | What it is | Works with | Build today? |
|---|---|---|---|
| **1. Data network (invisible, strongest moat)** | Every reader makes everyone's paper better: "readers like you finished this", story quality from completion and reports, and the **source scout** adding sources for everyone | Any number of readers | **Yes:** co-read boost (30 min) + source scout |
| **2. People network (small circles)** | **"Send this story to a friend's paper":** it shows up in *their* tomorrow's paper as "Saim thinks you'd like this". No account yet? The link onboards them with that story as their first swipe. **Gift papers** for family. **Daily 3 challenge** links ("I got 3/3, beat me") | 2 people | **Yes:** send-to-friend (45 min), gift, Daily 3 |
| **3. Editor network (the venture-scale vision)** | **Desks:** anyone with taste publishes a beat ("The Climate Desk by Ayesha"). Others add it as a section in their paper. Editors earn a share of subscription revenue, Spotify-style. Later publishers join and get paid per read | Needs thousands of users | **No.** Pitch it as phase 5 and show one seeded example desk at most |

**Pitch line:** *"Fold gets smarter with every reader, not just for that reader. And the best readers become editors."*

---

## 8. Evals: three numbers on screen

| Metric | How | Target to show |
|---|---|---|
| **Relevance lift** | Learning Lab: 3 simulated readers with hidden interests; share of their paper matching those interests, day 1 → day 7, vs. "onboarding only" and "random" baselines; with a diversity floor | Clear upward curve; diversity stays above the floor |
| **Grounding rate** | % of brief sentences that passed the fact-check pass | ≥ 95% |
| **Cost + speed** | Tokens and cost per edition, time from "finish onboarding" to "paper unfolds" | ~$0.0025/edition, < 20 s |

Put them on `/newsroom` and in the README. AI-studio judges trust evals more than demos.

---

## 9. Can 50 users run on free tiers? Yes, with margin

**What 50 users need on launch day:**
- About 1 onboarding parse each
- 1–3 edition builds each (rebuilds capped)
- A news-job run every 3 h writing up ~800 stories a day
- A fact-check pass on the stories that get printed
- Learning Lab runs

| Resource | Free limit (approx., verify) | 50-user need | OK? |
|---|---|---|---|
| Groq (gpt-oss, Llama, Qwen, Whisper) | ~30 req/min; ~1K req/day on big models; **daily token caps** | ~150–250 calls, ~1M tokens spread across 3–4 models | ✅ if spread across models + queue |
| Mistral free plan | ~1B tokens/month, ~1–2 req/s | ~2M tokens/day of write-ups (~200 calls) | ✅ |
| Gemini free | volatile | fallback only | ✅ |
| Embeddings | local in worker | — | ✅ $0 |
| Supabase free | 500 MB DB, 1 GB storage, 50K monthly users | tiny | ✅ (sign in with Google; built-in email reaches your team only) |
| Vercel Hobby | non-commercial | no payments during the hackathon | ✅ |
| GitHub Actions | 2,000 min/month private, unlimited public | ~80 min/day | ✅ |
| Email | Gmail SMTP with an app password ≈ 500/day free; Resend free needs a domain | 50/day | ✅ via Gmail SMTP |
| PostHog / Sentry / Turnstile / uptime | free tiers | small | ✅ |

**Worst case, if every free tier died, it would all run on paid open models (pay per use):**
- ~$0.005 per user per day (~20K tokens in, 5K out on gpt-oss-120b-class pricing)
- 50 users ≈ **$0.25/day**
- News job ≈ **$0.50/day**
- **Under $1/day.**

### How to spend your $5
**Put it into OpenRouter prepaid credits** (after their purchase fee, roughly $4+ usable).
- It's prepaid, so you **cannot overspend**.
- One key gives every open model (gpt-oss, Qwen, Llama, Mistral) with pay-per-token pricing and no daily caps.
- Make it the **last link in the fallback chain**, so the paper never fails to print during the demo or launch.
- That covers roughly 5+ days of 50 users even with zero free tiers.

Skip the custom domain for now. A `*.vercel.app` URL plus Gmail SMTP is fine for launch day; buy the domain when you go public in week 2.

---

## 10. Two Claude Code sessions: Desktop = frontend, CLI = backend

Good split. **Desktop has the built-in browser preview**, so it can see and screenshot the UI as it builds, which is perfect for frontend. The **CLI** suits long-running scripts, the database and deploys.

**Rules that stop the two from colliding:**
1. **One repo, two git worktrees** (separate folders, separate branches, separate `node_modules`):
   - `E:\ai-hackathon\fold`, branch `main` (integration)
   - `E:\ai-hackathon\fold-web`, branch `web`, **Desktop / frontend**
   - `E:\ai-hackathon\fold-core`, branch `core`, **CLI / backend**
2. **Folder ownership.** Frontend owns `src/app/(site)/**`, `src/components/**`, `src/styles/**`, `src/app/print/**`. Backend owns `src/app/api/**`, `src/press/**`, `src/edition/**`, `src/learning/**`, `src/lib/**`, `supabase/**`, `.github/**`, `worker/**`.
3. **The contract is the handshake.** `src/types/edition.ts` + `fixtures/edition.sample.json` are written first, by the backend, and merged to `main` before anything else. The frontend builds against the fixture (`NEXT_PUBLIC_DATA=fixture`) until the real API lands. Contract changes are requested, not edited, by the frontend.
4. **Ports:** frontend dev on `3000`, backend dev on `3001`.
5. **Merge to `main` every ~60–90 min** (each session rebases on `main` first). Deploy `main` to Vercel.
6. Both sessions read the same root `CLAUDE.md` (project rules). Each gets its own brief: [briefs/FRONTEND.md](briefs/FRONTEND.md), [briefs/BACKEND.md](briefs/BACKEND.md).
7. At **H8**, open a third session (CLI) as the **launch desk**: it watches Sentry and `/newsroom`, fixes bugs and commits hotfixes.

---

## 11. Why we'll beat the other 99, and what's still missing

### Our unfair advantages (most teams will have 1–2 of these; we stack 8)
1. **Real users + visible iteration:** launch at H8, a "v1.1 from your feedback" commit trail, live funnel numbers.
2. **Evals on screen:** relevance lift, grounding rate, cost per edition.
3. **Every sentence cited:** trust that's visible.
4. **A source graph, not a source list:** primary sources, cross-language world press, a self-growing catalog.
5. **Ritual mechanics:** finite paper, Daily 3, streak, cliffhanger, gifts.
6. **Print-grade craft:** a PDF people would actually print.
7. **An investable business:** unit economics, network effects, a phased vision.
8. **An open-model stack:** no vendor lock-in; we own the cost curve.

### Still missing (and the fix)
| Gap | Fix |
|---|---|
| **The name "Fold" is taken.** Fold Holdings, a bitcoin rewards company, is Nasdaq-listed as FLD; that's a trademark problem at launch | Pick a name in 2 minutes. Suggestion: **Masthead** ("the paper with your name on it"), since name-in-masthead is our most shareable moment. Check the domain later |
| **Founder story:** "why you?" | One honest line in the pitch: why *you* care (your parents and WhatsApp forwards? your own news fatigue?) |
| **Accessibility** | Large-print mode doubles as accessibility; semantic HTML, contrast, keyboard navigation (the impeccable skill audits this) |
| **Demo fragility** | Record the Loom from a warmed-up state; keep a pre-recorded backup of the onboarding segment |
| **Time zones** | Editions build at each reader's local 6:30 AM (cron hourly, select users whose local time matches) |
| **Investor follow-up** | Hackathon day is the pitch; **day 7 is the investment conversation.** Email the sponsor a 1-page update: users, day-7 retention, grounding rate, cost per edition, what you shipped since |
