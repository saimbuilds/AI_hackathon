# Backend API (for the frontend session)

Backend-owned. Types: `src/types/edition.ts`, `src/types/events.ts`. Fixture: `fixtures/edition.sample.json`.
Product name lives in `src/lib/brand.ts` only.

## Auth: every call needs a session

1. Sign in with supabase-js using `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`:
   `supabase.auth.signInAnonymously()` first; link Google later (`linkIdentity`). **Anonymous sign-ins must be enabled** in the Supabase dashboard.
2. Send `Authorization: Bearer <session.access_token>` on every `/api/*` call. No cookies.
3. Errors are JSON: `{ error: string, ...extra }` with 400 (bad input, `issues[]`), 401, 409, 413, 429 (`retryAfterSeconds`), 503.

Reading data directly with supabase-js works under RLS (own rows only): `editions`, `events`, `profiles`, `edition_stories`, `feedback`, `gifts`; and shared `stories`, `story_sentences` (verified only), `daily_three`.

## Onboarding

| Call | Body → Response |
|---|---|
| `POST /api/onboarding/parse` | `{ text }` → `{ parsed: { interests[], topics[], entities[], negatives[], negativeTopics[], role?, city?, goals?, depth? }, source: 'llm' \| 'heuristic' }`. Show `interests` / `negatives` as editable chips. `topics` are slugs from the fixed vocabulary (`TOPICS` in `src/lib/taxonomy.ts`) |
| `GET /api/onboarding/deck?n=12` | → `{ cards: [{ storyId, headline, dek, category, outlets, imageUrl }] }`: 12 real headlines from today, spread over the interest space. Swipe right = `yes`, up = `love`, left = `no` |
| `POST /api/transcribe` | multipart `file` (webm/mp3/wav, max 4 MB), optional `language` → `{ text }`. On 503 with `useBrowserSpeech: true`, fall back to Web Speech |
| `POST /api/onboarding/complete` | `{ name, paperName?, city?, lat?, lon?, tz, deliveryTime:'07:00', size:'espresso'\|'standard'\|'long', tone:'straight'\|'new'\|'witty', language?, largePrint?, calm?, role?, goals?, extras?:{weather,prayer,markets,cricket,onThisDay,quiz,audio}, interests:{ chips[], topics[], entities[], negatives[], negativeTopics[] }, swipes:[{storyId, action:'love'\|'yes'\|'no'}], email?, emailOptIn? }` → `{ ok: true }`. Saves the profile and computes the first taste vectors |

## Building the paper

`POST /api/edition/build` body `{ rebuild?: boolean }`: a **Server-Sent Events stream** (use `fetch` + `response.body.getReader()`; `EventSource` can't send the auth header).
Each `data:` line is a `BuildProgress` (`src/types/events.ts`):
`queued {position}` → `reading {articles, sources}` → `clustering {stories}` → `picking {picked, forName}` → `layout` → `note` → `done {editionId}` or `error {message, retryable}`.
- That stream **is** the printing-press animation: `reading`/`clustering` carry real counts to display.
- Max 5 builds run at once; the rest see `queued` with their position.
- A second call the same day returns `done` immediately with the existing edition. `rebuild: true` reprints (max 3/day, then 429).
- Typical build: 5–10 s. With every LLM down it still prints (`edition.meta.fallback === true`).

Then read the edition with supabase-js: `from('editions').select('payload').eq('id', editionId).single()` → `Edition`. List the archive with `from('editions').select('id,date,number').order('date', {ascending:false})`.

Citations: each `body[i].sources` is a list of 1-based indexes into that slot's `sources`.

## Learning, trust and account

| Call | Notes |
|---|---|
| `POST /api/events` | `{ events: ReaderEvent[] }` (max 100): batch every few seconds and on page hide. Log `edition_open`, `impression`, `open`, `dwell`, `read_end`, `click_original`, `save`, `more`, `less` (**needs `meta.reason`**: topic / source / too-long / already-knew), `skip`, `quiz_answer`, `caught_up`, `share`, `mute`. Returns `{ accepted, dropped, streak }`. The next build reflects it. **Use `caught_up` for the streak**: the server counts it once per local day |
| `POST /api/feedback` | `{ kind: 'wrong-facts' \| 'broken-link' \| 'not-for-me' \| 'general' \| 'nps', message?, editionId?, storyId?, score? }`: the "Report a problem" menu on every story, and the one-question feedback |
| `POST /api/turnstile` | `{ token }` from the Cloudflare widget. When `TURNSTILE_SECRET` is set, `/api/onboarding/complete` and `/api/edition/build` answer 403 `{ needsTurnstile: true }` until this succeeds |
| `GET /api/me` | downloads the reader's own data as JSON |
| `DELETE /api/me` | `{ confirm: "delete my paper" }`: "Delete my paper & data" |
| `GET /api/admin/stats` | header `x-admin-key`. For `/newsroom`: readers, editions, queue depth, last press runs (**grounding rate** in `press.last.stats.enrich.grounding`), LLM calls and cost per provider, budget headroom, jobs, open feedback |

## Not built yet (coming from the backend)

`GET /api/pdf/[id]` + `GET /api/print/[id]` (needs the frontend `/print/[id]` route), `/api/lab`, gifts / send-to-friend, email delivery.
