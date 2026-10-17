// All embeddings are computed here, in the worker. The web app never embeds.
// multilingual-e5-small: 384-d, ~100 languages. Needs the "passage: " / "query: " prefixes.
import { env, pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';

env.cacheDir = process.env.TRANSFORMERS_CACHE ?? '.cache/transformers'; // cached by GitHub Actions

const MODEL = 'Xenova/multilingual-e5-small';
export const EMBED_DIM = 384;

let extractor: Promise<FeatureExtractionPipeline> | undefined;
const load = () => (extractor ??= pipeline('feature-extraction', MODEL, { dtype: 'q8' }) as Promise<FeatureExtractionPipeline>);

// Returns L2-normalised vectors, so cosine similarity = dot product.
export async function embed(texts: string[], kind: 'passage' | 'query' = 'passage', batchSize = 16): Promise<Float32Array[]> {
  const model = await load();
  const out: Float32Array[] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize).map((t) => `${kind}: ${t}`);
    const res = await model(batch, { pooling: 'mean', normalize: true });
    const flat = res.data as Float32Array;
    for (let j = 0; j < batch.length; j++) out.push(flat.slice(j * EMBED_DIM, (j + 1) * EMBED_DIM));
  }
  return out;
}

export { dot, normalize, toPg, fromPg } from '../lib/vec';
