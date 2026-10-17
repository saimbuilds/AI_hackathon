// Confirms every model ID in src/lib/models.ts still exists at its provider.
// Run: pnpm models:check   (reads keys from .env.local; providers without a key are skipped)
import { MODELS, PROVIDERS, TRANSCRIBE, type Provider } from '../src/lib/models';

const listed = new Map<Provider, Set<string> | 'skipped' | string>();

for (const [name, p] of Object.entries(PROVIDERS) as [Provider, (typeof PROVIDERS)[Provider]][]) {
  const key = process.env[p.keyEnv];
  if (!key && name !== 'openrouter') { listed.set(name, 'skipped'); continue; } // OpenRouter lists without a key
  try {
    const res = await fetch(`${p.baseUrl}/models`, { headers: key ? { authorization: `Bearer ${key}` } : {}, signal: AbortSignal.timeout(15000) });
    if (!res.ok) { listed.set(name, `HTTP ${res.status}`); continue; }
    const json = (await res.json()) as { data?: { id: string }[] };
    // Gemini's OpenAI endpoint prefixes ids with "models/".
    listed.set(name, new Set((json.data ?? []).map((m) => m.id.replace(/^models\//, ''))));
  } catch (e) {
    listed.set(name, String(e));
  }
}

let missing = 0;
const check = (provider: Provider, id: string, label: string) => {
  const set = listed.get(provider);
  if (set === 'skipped') return console.log(`-  ${label.padEnd(26)} ${id}  (no ${provider} key, skipped)`);
  if (typeof set === 'string') return console.log(`?  ${label.padEnd(26)} ${id}  (${provider} list failed: ${set})`);
  if (set?.has(id)) return console.log(`ok ${label.padEnd(26)} ${id}`);
  missing++;
  console.log(`!! ${label.padEnd(26)} ${id}  NOT FOUND at ${provider}`);
};

for (const [key, spec] of Object.entries(MODELS)) check(spec.provider, spec.id, key);
check(TRANSCRIBE.provider, TRANSCRIBE.id, 'transcribe');
if (missing) { console.log(`\n${missing} model id(s) need fixing in src/lib/models.ts`); process.exit(1); }
