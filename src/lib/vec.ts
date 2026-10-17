// Vector helpers shared by the worker and the API. No model dependencies: the web app never embeds.
export const dot = (a: ArrayLike<number>, b: ArrayLike<number>): number => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

export function normalize(v: ArrayLike<number>): Float32Array {
  let n = 0;
  for (let i = 0; i < v.length; i++) n += v[i] * v[i];
  n = Math.sqrt(n) || 1;
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / n;
  return out;
}

// out += weight * v (in place)
export function addScaled(out: Float32Array, v: ArrayLike<number>, weight: number): void {
  for (let i = 0; i < out.length; i++) out[i] += weight * v[i];
}

// pgvector wire format.
export const toPg = (v: ArrayLike<number>): string => `[${Array.from(v, (x) => Math.round(x * 1e6) / 1e6).join(',')}]`;
export const fromPg = (s: string): Float32Array => Float32Array.from(JSON.parse(s) as number[]);
