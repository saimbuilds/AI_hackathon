import { adminClient } from '../src/lib/supabase';
import { ensureTopicVectors } from '../src/press/topics';
import { loadTaste } from '../src/learning/taste';
console.log('topic vectors seeded:', await ensureTopicVectors());
const db = adminClient()!;
const { data } = await db.from('profiles').select('id,name').eq('name', process.argv[2] ?? 'Saim').limit(1);
console.log(JSON.stringify(await loadTaste(db, data![0].id), null, 1));
