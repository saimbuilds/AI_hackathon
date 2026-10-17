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

## Share to a friend

| Call | Notes |
|---|---|
| `POST /api/share` | `{ storyId }` -> `{ token, url, text, whatsappUrl }`. Link is `{APP_URL}/s/{token}` (override with `SHARE_URL_TEMPLATE`). Open `whatsappUrl` for the prefilled WhatsApp share |
| `GET /api/share/[token]` | public, no auth -> `{ fromName, story: { storyId, headline, dek, category, outlets, imageUrl } }`: the landing page for the link. Use the story as the friend's first swipe |
| `POST /api/share/[token]/claim` | auth (anonymous is fine) -> `{ ok, fromName, storyId }`. Call once the friend has a session. Their next paper includes the story with `fromFriend: "<name> thinks you'd like this"` |

## Gift papers ("Make one for someone you love")

| Call | Notes |
|---|---|
| `POST /api/gifts` | `{ forName, relation, fromName?, text?, interests?, language:'en'|'ur', largePrint, city?, tz?, tone?, size?, emailEveryMorning?, recipientEmail? }` -> `{ giftId, token, url }`. `text` is parsed like onboarding. Link is `{APP_URL}/gift/{token}` (`GIFT_URL_TEMPLATE`). Max 5 per giver |
| `GET /api/gifts` | the giver's gifts with `latestEdition` |
| `POST /api/edition/build` | add `giftId` to build a gift paper through the same queue (404 unless you made it) |
| `GET /api/gift/[token]` | **public, no account**: `{ gift: { forName, fromName, relation, language, largePrint }, edition: Edition | null, needsBuild }`: the recipient's read-only paper ("Compiled for Abbu by Saim") |
| `POST /api/gift/[token]` | public: prints today's paper if `needsBuild` -> `{ editionId }` (can take 10-60 s; show the press animation) |

## Contract change (additive, on `main`)

`Edition` now has `language: 'en' | 'ur'` and `largePrint: boolean` (defaults `'en'` / `false`, fixture updated).
- `language: 'ur'` means the copy is Urdu: render right-to-left in Noto Nastaliq. It is only `'ur'` when translation really succeeded; if the model was unavailable the paper stays English and says `'en'` (`gift.language` is the same).
- `largePrint: true`: typeset large; the paper is also shorter (about 4-6 stories).

## Learning Lab (for the /lab page)

`GET /api/lab`: public, no auth, cached 5 min. Latest run: `{ generatedAt, mode: 'keywords'|'llm'|'mixed', config, pool, personas[], summary }`.
- Chart: `summary.byDay.{fold,onboarding,random}[] = { day, relevance, diversity }` (relevance = share of the paper the simulated reader would read; diversity = normalised topic entropy, floor `summary.diversity.floor`). `summary.gapVsOnboarding[] = { day, points }` is fold minus the static-profile baseline per day: the learning effect.
- Time-travel slider: `personas[i].policies.fold[d].stories[] = { id, headline, topics, label: 'love'|'open'|'skip'|'less' }` is persona i's paper on day d+1.
- Say what it is: simulated readers with hidden interests, real stories sliced into simulated days (`pool.note`).

## Source scout (niche interests grow the catalog)

- `POST /api/onboarding/parse` also returns `niche: string[]`: chips that map to none of the fixed topics ("Formula E", "Kenyan fintech").
- `POST /api/scout` `{ beat }` -> `{ status: 'added' | 'known', beat, added: [{ name, feedUrl }] }`. Call once per niche chip after onboarding (fire and forget; it can take 10-60 s). It finds outlets covering the beat, discovers and validates their RSS feeds, vets them, and adds them to the catalog for everyone. Stories from them appear after the next press run (about 3 h; sooner if `GITHUB_DISPATCH_TOKEN` is set). A beat scouted in the last 7 days returns `known`.

## PDF

| Call | Notes |
|---|---|
| `GET /api/pdf/[editionId]` | auth header, or `?access_token=<token>` so a plain `<a href download>` works. Returns `application/pdf` (A4, headless Chromium, cached 7 days; `?inline=1` to display). If rendering is unavailable: **503** `{ fallback: 'client-print', printUrl }`: open `printUrl` and call `window.print()` (same page, same design) |
| `GET /api/gift/[token]/pdf` | public: the gift paper's latest edition as a PDF; same fallback contract |
| `GET /api/print/[editionId]?pt=<print token>` | **for the frontend's `/print/[id]` page only**: returns the `Edition`. 403 without a valid token |

**The frontend owns `src/app/print/[id]/page.tsx`**, and the PDF is only as good as that page. Contract:
1. Route `/print/[id]?pt=<token>` (the server mints `pt`, valid ~3 min for that edition only; the fallback `printUrl` carries a 15 min one).
2. Server component fetches `${APP_ORIGIN}/api/print/${id}?pt=${pt}` for the `Edition` (no login, no supabase client).
3. Layout for `@page { size: A4 }` (columns, hyphenation, QR code per story linking to `sources[0].url`). Use `edition.language === 'ur'` for RTL/Nastaliq and `edition.largePrint`.
4. When fonts and images are ready set `document.documentElement.dataset.printReady = 'true'` (the renderer waits up to 8 s for it, then prints anyway).
5. Local test without the real page: `PRINT_BASE_URL=http://localhost:4010 pnpm dev -p 3001` + `scripts/e2e-pdf.mts` (uses a stand-in page and your installed Chrome).

## Not built yet (coming from the backend)

Nothing on the build table; see `docs/BACKEND_STATUS.md` for what is unverified without LLM keys.
