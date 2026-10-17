// Seeds `topic_vectors` (once, then only when a description changes) so the web app can map
// onboarding topics to fingerprints without ever running a model.
import { adminClient } from '../lib/supabase';
import { TOPICS } from '../lib/taxonomy';
import { embed, toPg } from './embed';

export async function ensureTopicVectors(): Promise<number> {
  const db = adminClient();
  if (!db) throw new Error('Supabase env missing');
  const { data } = await db.from('topic_vectors').select('topic,description');
  const have = new Map((data ?? []).map((r) => [r.topic as string, r.description as string]));
  const todo = Object.entries(TOPICS).filter(([slug, desc]) => have.get(slug) !== desc);
  if (!todo.length) return 0;
  const vecs = await embed(todo.map(([slug, desc]) => `${slug.replace(/-/g, ' ')}: ${desc}`), 'query');
  const { error } = await db.from('topic_vectors').upsert(todo.map(([topic, description], i) => ({ topic, description, embedding: toPg(vecs[i]), updated_at: new Date().toISOString() })), { onConflict: 'topic' });
  if (error) throw new Error(`topic_vectors: ${error.message}`);
  return todo.length;
}
