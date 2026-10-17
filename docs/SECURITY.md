# What protects readers

A plain list for the Trust & Security page. Each line is something the running system does today.

## Your data is yours
- **Row-level security on every table.** Readers can only read their own profile, editions, events, feedback, gifts, shares, follows and follow updates. News (stories, verified sentences, the Daily 3) is shared; raw articles, sources, usage logs, jobs and press runs are server-only (RLS on, no policies).
- **Readers can't edit server-owned fields.** Column-level grants let a reader change their own name, city, paper settings and email preferences, but not their plan, streak, learned taste vectors or the human-check flag.
- **Anonymous first.** You can read without giving an email. Linking Google later is optional.
- **Export and delete.** `GET /api/me` downloads everything we hold about you as JSON; `DELETE /api/me` (typed confirmation) deletes your account and every row that belongs to it (cascading foreign keys).
- **One-click unsubscribe** with a signed link (no login needed, can't be forged for someone else).

## Every request is checked
- **Bearer-token auth** on every API route (Supabase session token, verified server-side; no cookies, so no CSRF).
- **zod validation** of every request body and every model output; oversized bodies are rejected (413).
- **Rate limits** per reader and per IP on every route (ask, follow, build, share, gifts, feedback, onboarding), plus durable daily caps where it matters (3 reprints a day, 5 gifts, 3 free follows).
- **Optional Cloudflare Turnstile** human check on the expensive routes (onboarding, building a paper) when `TURNSTILE_SECRET` is set.
- **The service-role key never leaves the server**; secrets live only in Vercel / GitHub secrets.

## The AI can't make things up
- **Grounded write-ups.** Each story is written once from its source articles; every sentence must cite the articles it comes from.
- **Two-model fact-check.** A second model from a different family checks every sentence against the excerpts it cites; a number in a sentence must appear in its sources. Unsupported sentences are dropped, never printed. Today's grounding rate (share of sentences that passed) is shown in the paper and on /newsroom.
- **The editor selects and frames, never changes facts.** "For you" lines carry no financial or medical advice.
- **Ask answers only from the news we've verified.** If the papers haven't covered your question, it says so and offers to follow it, instead of guessing. Every answer sentence cites a story; uncited or number-mismatched sentences are removed.
- **No AI-generated news images.** Real photos or typography only.
- **If every AI provider is down, the paper still prints** from ranking, stored verified briefs and template copy (`meta.fallback = true`).

## Prompt-injection fencing
- Scraped articles, your questions and story text are wrapped in `<<<UNTRUSTED …>>>` delimiters (delimiter look-alikes inside are defused) and the model is told they are data, never instructions.
- Models only return JSON validated against a schema; they have no tools, no browsing and no access to other readers' data.

## Browser hardening (all pages)
- **Content-Security-Policy**: scripts and connections only from this site, Supabase and Cloudflare Turnstile; fonts from Google Fonts; no plugins; `frame-ancestors 'none'` (no clickjacking).
- **HSTS** (2 years, preload), **Referrer-Policy** `strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Cross-Origin-Opener-Policy: same-origin`.
- **Permissions-Policy**: microphone only for this site (voice onboarding), camera and payment off.

## Abuse and cost controls
- Per-model daily budget guard and a paid-spend ceiling (`LLM_PAID_DAILY_USD`, default $5/day); a provider that says "no credit" is benched automatically.
- Build queue with a Postgres semaphore (max 5 at once) so a burst can't take the press down.
- Signed, expiring print tokens for PDFs; PDF cache is per edition.

## Known limits (honest)
- In-memory rate limits are per serverless instance: speed bumps, not walls. Durable caps are enforced in the database.
- Supabase's "leaked password protection" is off: there is no password sign-in (anonymous + Google only).
- `'unsafe-inline'` scripts are allowed because Next.js prerendering injects inline scripts; nonces would disable static rendering.
