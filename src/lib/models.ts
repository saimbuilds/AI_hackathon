// The ONLY place model IDs, providers, routes and budgets live (TECH.md §3).
// Provider IDs and free limits change: run `pnpm models:check` (needs the keys) to
// confirm every ID below still exists, and tune the caps from each console's quota page.

export type Provider = 'anthropic' | 'groq' | 'mistral' | 'gemini' | 'openrouter';

export type Task =
  | 'enrich' // write once per story (bulk)
  | 'factcheck' // verify each sentence against its cited excerpts
  | 'parse' // onboarding sentence -> interests/entities/negatives
  | 'editor' // one call per reader per day
  | 'translate' // gift papers
  | 'sim' // Learning Lab reader personas
  | 'memo' // nightly reader memo
  | 'daily3' // the shared Daily 3 quiz
  | 'ask' // reader question -> answer grounded only in press stories
  | 'watch' // does a new story change a followed answer?
  | 'keywords'; // reader question -> search keywords

export const PROVIDERS: Record<
  Provider,
  { baseUrl: string; keyEnv: string; paid: boolean; extraHeaders?: Record<string, string> }
> = {
  // Optional: Anthropic's OpenAI-compatible endpoint. Skipped when ANTHROPIC_API_KEY is empty.
  anthropic: { baseUrl: 'https://api.anthropic.com/v1', keyEnv: 'ANTHROPIC_API_KEY', paid: true },
  groq: { baseUrl: 'https://api.groq.com/openai/v1', keyEnv: 'GROQ_API_KEY', paid: false },
  mistral: { baseUrl: 'https://api.mistral.ai/v1', keyEnv: 'MISTRAL_API_KEY', paid: false },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    keyEnv: 'GEMINI_API_KEY',
    paid: false,
  },
  // Prepaid credit: cannot overspend. Last link of every chain.
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    keyEnv: 'OPENROUTER_API_KEY',
    paid: true,
    extraHeaders: { 'X-Title': 'Fold' },
  },
};

export type ModelSpec = {
  provider: Provider;
  id: string;
  // Daily guards (per provider+model). Hitting one skips the link; the real limit is the 429.
  dailyRequests: number;
  dailyTokens: number;
  // USD per 1M tokens: only used for paid providers when the response has no cost field.
  priceIn?: number;
  priceOut?: number;
  // Merged into the request body (e.g. hide reasoning, lower effort).
  extra?: Record<string, unknown>;
};

export const MODELS = {
  'groq/gpt-oss-120b': {
    provider: 'groq', id: 'openai/gpt-oss-120b', dailyRequests: 900, dailyTokens: 200_000,
    extra: { reasoning_effort: 'low' },
  },
  'groq/gpt-oss-20b': {
    provider: 'groq', id: 'openai/gpt-oss-20b', dailyRequests: 900, dailyTokens: 200_000,
    extra: { reasoning_effort: 'low' },
  },
  'groq/llama-3.1-8b': {
    provider: 'groq', id: 'llama-3.1-8b-instant', dailyRequests: 14_000, dailyTokens: 500_000,
  },
  'groq/qwen3-32b': {
    provider: 'groq', id: 'qwen/qwen3-32b', dailyRequests: 900, dailyTokens: 500_000,
    extra: { reasoning_format: 'hidden' },
  },
  'mistral/small': {
    provider: 'mistral', id: 'mistral-small-latest', dailyRequests: 5_000, dailyTokens: 20_000_000,
  },
  // 2.5 is closed to new keys (404 "use gemini-3.5-flash-lite"); the current key gets 403 on every model,
  // so the direct Gemini links are out of the routes until a working key exists. Same models via OpenRouter below.
  'gemini/flash-lite': {
    provider: 'gemini', id: 'gemini-3.5-flash-lite', dailyRequests: 500, dailyTokens: 2_000_000,
  },
  'gemini/flash': {
    provider: 'gemini', id: 'gemini-3.5-flash', dailyRequests: 200, dailyTokens: 1_000_000,
  },
  'anthropic/haiku': {
    provider: 'anthropic', id: 'claude-haiku-5-5', dailyRequests: 5_000, dailyTokens: 10_000_000,
    priceIn: 0.1, priceOut: 0.5,
  },
  'anthropic/sonnet': {
    provider: 'anthropic', id: 'claude-sonnet-5-5', dailyRequests: 1_000, dailyTokens: 3_000_000,
    priceIn: 2, priceOut: 10,
  },
  'openrouter/claude-haiku': {
    provider: 'openrouter', id: 'anthropic/claude-haiku-5.5', dailyRequests: 5_000, dailyTokens: 10_000_000,
    priceIn: 0.1, priceOut: 0.5,
  },
  // Free (no credit needed, ~50 requests/day per account; 1,000/day once any credit was bought). Last resort.
  'openrouter/free-nemotron': {
    provider: 'openrouter', id: 'nvidia/nemotron-3-super-120b-a12b:free', dailyRequests: 45, dailyTokens: 2_000_000,
    priceIn: 0, priceOut: 0,
  },
  'openrouter/gemini-flash-lite': {
    provider: 'openrouter', id: 'google/gemini-2.5-flash-lite', dailyRequests: 5_000, dailyTokens: 10_000_000,
    priceIn: 0.1, priceOut: 0.4,
  },
  'openrouter/gpt-oss-120b': {
    provider: 'openrouter', id: 'openai/gpt-oss-120b', dailyRequests: 5_000, dailyTokens: 5_000_000,
    priceIn: 0.15, priceOut: 0.6,
  },
  'openrouter/gpt-oss-20b': {
    provider: 'openrouter', id: 'openai/gpt-oss-20b', dailyRequests: 5_000, dailyTokens: 5_000_000,
    priceIn: 0.05, priceOut: 0.2,
  },
  'openrouter/mistral-small': {
    provider: 'openrouter', id: 'mistralai/mistral-small-3.2-24b-instruct', dailyRequests: 5_000,
    dailyTokens: 5_000_000, priceIn: 0.1, priceOut: 0.3,
  },
  'openrouter/llama-3.1-8b': {
    provider: 'openrouter', id: 'meta-llama/llama-3.1-8b-instruct', dailyRequests: 5_000,
    dailyTokens: 5_000_000, priceIn: 0.03, priceOut: 0.05,
  },
  'openrouter/qwen3-32b': {
    provider: 'openrouter', id: 'qwen/qwen3-32b', dailyRequests: 5_000, dailyTokens: 5_000_000,
    priceIn: 0.1, priceOut: 0.3, extra: { reasoning: { exclude: true } },
  },
} as const satisfies Record<string, ModelSpec>;

export type ModelKey = keyof typeof MODELS;

// Fallback chain per task: first = preferred. Links without a key are skipped instantly (no request),
// so the chain degrades to whatever keys exist. Cost order: bulk work (enrich, fact-check) goes to free
// providers first (Groq, Mistral), then paid OpenRouter (Claude Haiku 5.5 writes, Gemini Flash-Lite, a different
// model family, checks). Low-volume reader-facing calls (editor, ask) prefer Claude for quality: cents per day.
// A 402 (no OpenRouter credit) benches the paid OpenRouter links for 10 minutes; the free model is the last link.
export const ROUTES: Record<Task, ModelKey[]> = {
  enrich: ['mistral/small', 'groq/gpt-oss-120b', 'openrouter/claude-haiku', 'openrouter/gemini-flash-lite', 'openrouter/mistral-small'],
  factcheck: ['groq/llama-3.1-8b', 'mistral/small', 'openrouter/gemini-flash-lite', 'openrouter/mistral-small'],
  parse: ['groq/gpt-oss-20b', 'mistral/small', 'openrouter/gemini-flash-lite', 'openrouter/claude-haiku', 'openrouter/free-nemotron'],
  editor: ['anthropic/haiku', 'openrouter/claude-haiku', 'groq/gpt-oss-120b', 'mistral/small', 'openrouter/gpt-oss-120b', 'openrouter/free-nemotron'],
  translate: ['openrouter/claude-haiku', 'groq/qwen3-32b', 'mistral/small', 'openrouter/gemini-flash-lite', 'openrouter/qwen3-32b'],
  sim: ['groq/gpt-oss-20b', 'mistral/small', 'openrouter/gemini-flash-lite', 'openrouter/gpt-oss-20b'],
  memo: ['groq/llama-3.1-8b', 'mistral/small', 'openrouter/gemini-flash-lite', 'openrouter/llama-3.1-8b'],
  daily3: ['openrouter/claude-haiku', 'groq/gpt-oss-120b', 'mistral/small', 'openrouter/gpt-oss-120b', 'openrouter/free-nemotron'],
  ask: ['anthropic/haiku', 'openrouter/claude-haiku', 'groq/gpt-oss-120b', 'mistral/small', 'openrouter/gemini-flash-lite', 'openrouter/free-nemotron'],
  watch: ['groq/llama-3.1-8b', 'mistral/small', 'openrouter/gemini-flash-lite', 'openrouter/free-nemotron'],
  keywords: ['groq/llama-3.1-8b', 'mistral/small', 'openrouter/gemini-flash-lite', 'openrouter/free-nemotron'],
};

// Per-task defaults; callers can override per call.
export const TASK_DEFAULTS: Record<Task, { timeoutMs: number; maxTokens: number; temperature: number }> = {
  enrich: { timeoutMs: 60_000, maxTokens: 6000, temperature: 0.2 },
  factcheck: { timeoutMs: 20_000, maxTokens: 1500, temperature: 0 },
  parse: { timeoutMs: 12_000, maxTokens: 700, temperature: 0 },
  editor: { timeoutMs: 30_000, maxTokens: 6000, temperature: 0.5 },
  translate: { timeoutMs: 45_000, maxTokens: 8000, temperature: 0.2 }, // Urdu needs ~2.5x the tokens of English
  sim: { timeoutMs: 20_000, maxTokens: 800, temperature: 0.7 },
  memo: { timeoutMs: 15_000, maxTokens: 300, temperature: 0.3 },
  daily3: { timeoutMs: 30_000, maxTokens: 1500, temperature: 0.3 },
  ask: { timeoutMs: 20_000, maxTokens: 900, temperature: 0.1 },
  watch: { timeoutMs: 15_000, maxTokens: 600, temperature: 0 },
  keywords: { timeoutMs: 8_000, maxTokens: 200, temperature: 0 },
};

// Whisper is not a chat model: used by /api/transcribe, not llm().
export const TRANSCRIBE = { provider: 'groq', id: 'whisper-large-v3-turbo' } as const;

// Daily USD ceiling for paid providers (OpenRouter prepaid is the hard stop anyway).
export const PAID_DAILY_USD = Number(process.env.LLM_PAID_DAILY_USD ?? 1);
