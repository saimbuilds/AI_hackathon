# Backend status (fold-core / branch `core`)

Last updated: 2026-10-17. Working name "Fold"; the name lives only in `src/lib/brand.ts` (+ `package.json` name).
Branch `core` is ahead of `main` only by the Lab groundwork (migration 10 + `src/lab/personas.ts`); everything else is on `main` (last merge `92f7966`).

## Things only the owner can unblock

| Needed | Why | Where |
|---|---|---|
| **LLM keys**: `GROQ_API_KEY`, `MISTRAL_API_KEY`, `OPENROUTER_API_KEY` (+ optional `GEMINI_API_KEY`) | Every LLM path is built and unit-tested with stubs but **never run against a real model**: write-once enrichment, fact-check, editor, Daily 3, parse, translation (Urdu), memo, Lab reader | `.env.local`, Vercel env, GitHub secrets. Then run `pnpm models:check` (Groq/Mistral/Gemini model IDs and the daily caps in `src/lib/models.ts` are unverified guesses; only OpenRouter IDs were checked live) |
| Supabase: **Authentication → Sign In → allow anonymous sign-ins** | Onboarding is anonymous-first | Supabase dashboard (not verified on) |
| **GitHub Actions secrets**: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, LLM keys, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `APP_URL` | `press.yml`, `nightly.yml`, `email.yml` exist but have never run in CI; Actions minutes are unlimited only on a public repo | repo Settings → Secrets |
| `ADMIN_KEY`, optional `TURNSTILE_SECRET`, `SENTRY_DSN`, `PRINT_SECRET` | `/api/admin/stats`, human check, error tracking, PDF tokens | Vercel env |
| Frontend `/print/[id]` route | The PDF route (item 8) renders it | `fold-web` |

## Built and tested (on `main`)

| # | Item | State | How it was verified |
|---|---|---|---|
| setup | Next.js app, worktrees, Vercel (auto-deploys `main`, Seoul region), Supabase schema + 10 migrations, RLS | done | advisors clean (INFO only); prod deploys Ready |
| contract | `src/types/edition.ts`, `events.ts`, `fixtures/edition.sample.json` (real 16-17 Oct headlines) | done; **additive change**: `Edition.language`, `Edition.largePrint` | `pnpm check:contract` |
| llm | `models.ts` + `llm.ts`: task routing, fallback chain, 429 cooldown, per-model daily budget guard, usage logging, `LLM_DISABLED=1` kill switch | done, **stub-tested only** | 7 unit tests |
| 1 | Source catalog `worker/sources.json`: **530 live feeds** (curated, primary sources, 115 world-press, Kite sample), 28 languages | done | `pnpm sources:build` validates every feed |
| 2 | Press worker: fetch (per-host limits), dedupe, e5 fingerprints, clustering (threshold **0.90**, tuned on 1.5k real articles), threading, importance, Readability extraction | done | first real run: 5,877 articles → 4,778 stories (332 multi-outlet) in 7.4 min |
| 3 | Write-once enrichment (4 stories/call, cited sentences) + fact-check + number/citation guards + verbatim fallback; grounding rate to `press_runs` | built; **fallback path run for real, LLM path stub-tested only** | 6 unit tests; 156 stories fallback-enriched |
| 4 | Daily 3 (LLM, falls back to stored per-story quizzes) | built, never run (needs enriched stories + keys) | none |
| 5 | `press.yml` (3-hourly + dispatch, model cache), `nightly.yml`, `email.yml` | written, **never run in CI** | none |
| 6 | `/api/onboarding/parse` (LLM or keyword heuristic), `/deck` (farthest-point sampling), `/complete` (cold-start vectors), `/api/transcribe` (Whisper on Groq) | done; transcribe **untested** (needs Groq key) | HTTP e2e with a real session |
| 7 | Edition builder: candidates in Postgres (pgvector) → score → MMR → Thompson "Off Your Beat" → everyone's front page → editor (validated) → template fallback → immutable snapshot; `/api/edition/build` SSE with Postgres semaphore (max 5) | done; **editor LLM path never run** | e2e: 6-9 s with **no LLM**; RLS isolation checked |
| 9 | Learning: `/api/events`, Rocchio vectors, Beta topics, mutes, streak, co-read boost, nightly decay + memo | done | "less like this" visibly changes the next build (energy 21% → 0%); 11 unit tests |
| 10 | Launch hardening: `/api/admin/stats`, `/api/me` (export/delete), `/api/feedback`, `/api/turnstile`, rate limits, Sentry hook, `scripts/load-test.mts` | done except Sentry/Turnstile not exercised | **30-user load test: 30/30 in 79 s** (limit 2 min) |
| 11 | Email: hourly delivery, Gmail SMTP, signed one-click unsubscribe, dry-run mode | done; **no real email ever sent** | dry-run e2e, 4 unit tests |
| 12 | Send-to-friend (`/api/share*`, friend picks guaranteed a place) and gift papers (`/api/gifts`, public `/api/gift/[token]`, large print, Urdu translation with figure-preserving guards) | done; **real Urdu translation never run** (needs keys) | two-account e2e; stub-tested translation |

Totals: 55 unit tests, typecheck + lint + `next build` clean. API reference for the frontend: `docs/API.md`.

## Not done

| # | Item | Notes |
|---|---|---|
| 13 | **Learning Lab** | Partly started: table `lab_runs` (migration 10, applied) and `src/lab/personas.ts` (3 personas with hidden vs stated interests). **Next:** `src/lab/sim.ts` (pure simulator: 7 days sliced from the real story pool; policies Fold / onboarding-only / random; relevance@edition + topic diversity), keyword reader + LLM reader, `pnpm lab`, `GET /api/lab` (public, latest run), a synthetic-world unit test proving fold > onboarding-only > random. Pool is only ~2 days of real stories, so days are ~7 h slices; item 15 would give a real week |
| 8 | **PDF** `/api/pdf/[id]` | Blocked on the frontend `/print/[id]` page. Plan: short-lived HMAC print token, `GET /api/print/[id]?pt=` returns the edition for the print page, puppeteer-core + `@sparticuz/chromium-min`, 7-day Storage cache, client-print fallback flag |
| 14 | **Source scout** `scout.yml` | Google News RSS search → domains → RSS autodiscovery → recency check → LLM vet → add to catalog |
| 15 | **Backfill** 7 days of editions for the demo account | RSS carries only a few days; press currently fetches `maxAgeHours=48` (needs a wider window run) |
| – | README with eval numbers | after the Lab runs |
| – | `/newsroom` page | frontend; data is in `GET /api/admin/stats` |

## Known weaknesses (honest list)

- Everything user-visible that depends on an LLM (headlines/briefs/for-you/editor note/quiz/translation) is **unproven with a real model**. Without enrichment, editions use source titles and one verbatim sentence per story.
- Fallback classification (category from source feed, topics from nearest topic fingerprint) is noisy: e.g. a local news item filed under "Technology".
- Dev-machine builds take 6-9 s mostly from database round-trips to Seoul; production runs in `icn1`, expected faster, not yet measured.
- One "less like this" on a topic the reader listed at onboarding does not remove it (by design); several do.
- In-memory rate limits are per serverless instance (speed bumps, not walls). Per-IP limits are high on purpose (a venue shares one IP).
- `PRESS` writes ~5k rows per first run; Supabase free tier is 500 MB; article text pruning (14 days) is not implemented yet.

## Commands

`pnpm dev -p 3001` · `pnpm press [--dry --sources=N --no-extract --no-enrich --skip-press]` · `pnpm nightly` · `pnpm email [--force --user=<id> --to=<addr>]` · `pnpm sources:build` · `pnpm models:check` · `pnpm load [N]` · `pnpm test` · `pnpm typecheck && pnpm lint`
E2E scripts (need the dev server on :3001 and `.env.local`): `scripts/e2e-http.mts`, `e2e-learning.mts`, `e2e-share.mts`, `e2e-gift.mts`, `e2e-email.mts`, `e2e-edition.mts`.
