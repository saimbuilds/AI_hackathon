// The paper's "ears": weather, On this day, prayer times, FX. Free APIs, 3 s timeout, cached,
// and every one is optional: a failure just leaves the box out of the edition.
import type { Edition } from '../types/edition';
import type { Profile } from './candidates';

const cache = new Map<string, { at: number; value: unknown }>();
async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T | undefined> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  try {
    const value = await load();
    cache.set(key, { at: Date.now(), value });
    return value;
  } catch {
    return undefined;
  }
}
const getJson = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { signal: AbortSignal.timeout(3000), headers: { 'user-agent': 'FoldBot/0.1' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
};

const WMO: Record<number, string> = {
  0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Foggy', 48: 'Foggy', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 80: 'Showers', 81: 'Showers', 82: 'Heavy showers', 95: 'Thunderstorms', 96: 'Thunderstorms', 99: 'Thunderstorms',
};

async function coords(p: Profile): Promise<{ lat: number; lon: number } | undefined> {
  if (p.lat != null && p.lon != null) return { lat: p.lat, lon: p.lon };
  if (!p.city) return undefined;
  return cached(`geo:${p.city.toLowerCase()}`, 7 * 86_400_000, async () => {
    const r = await getJson<{ results?: { latitude: number; longitude: number }[] }>(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(p.city!)}&count=1`);
    if (!r.results?.[0]) throw new Error('not found');
    return { lat: r.results[0].latitude, lon: r.results[0].longitude };
  });
}

export async function loadExtras(p: Profile, date: string, opts: { weather?: boolean } = {}): Promise<{ weather?: Edition['weather']; extras: Edition['extras'] }> {
  // Weather and On this day are on unless switched off; prayer times and markets are opt-in.
  const want = (k: 'weather' | 'onThisDay' | 'prayer' | 'markets') => p.extras?.[k] ?? (k === 'weather' || k === 'onThisDay');
  const pos = await coords(p);
  const [mm, dd] = [date.slice(5, 7), date.slice(8, 10)];

  const [weather, onThisDay, prayer, markets] = await Promise.all([
    want('weather') && opts.weather !== false && pos // today's forecast would be wrong for a backfilled past day
      ? cached(`wx:${pos.lat.toFixed(1)},${pos.lon.toFixed(1)}:${date}`, 3 * 3_600_000, async () => {
          const r = await getJson<{ daily: { temperature_2m_max: number[]; temperature_2m_min: number[]; weather_code: number[] } }>(
            `https://api.open-meteo.com/v1/forecast?latitude=${pos.lat}&longitude=${pos.lon}&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=1`);
          return { hi: Math.round(r.daily.temperature_2m_max[0]), lo: Math.round(r.daily.temperature_2m_min[0]), summary: WMO[r.daily.weather_code[0]] ?? 'Fair' };
        })
      : undefined,
    want('onThisDay')
      ? cached(`otd:${mm}-${dd}`, 24 * 3_600_000, async () => {
          const r = await getJson<{ selected?: { text: string; year: number }[] }>(`https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/selected/${mm}/${dd}`);
          const list = r.selected ?? [];
          if (!list.length) throw new Error('empty');
          const e = list[(Number(mm) * 31 + Number(dd)) % list.length];
          return `${e.year}: ${e.text}`.slice(0, 240);
        })
      : undefined,
    want('prayer') && pos
      ? cached(`pr:${pos.lat.toFixed(1)},${pos.lon.toFixed(1)}:${date}`, 12 * 3_600_000, async () => {
          const r = await getJson<{ data: { timings: Record<string, string> } }>(`https://api.aladhan.com/v1/timings/${dd}-${mm}-${date.slice(0, 4)}?latitude=${pos.lat}&longitude=${pos.lon}&method=1`);
          const t = r.data.timings;
          return Object.fromEntries(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((k) => [k, t[k].slice(0, 5)]));
        })
      : undefined,
    want('markets')
      ? cached(`fx:${date}`, 6 * 3_600_000, async () => {
          const r = await getJson<{ rates: Record<string, number> }>('https://api.frankfurter.dev/v1/latest?base=USD&symbols=PKR,EUR,GBP,INR,JPY,CAD');
          const home = p.tz === 'Asia/Karachi' ? ['PKR'] : p.tz.startsWith('Asia/Kolkata') ? ['INR'] : /^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax)/.test(p.tz) ? ['CAD', 'EUR', 'GBP'] : p.tz === 'Europe/London' ? ['EUR', 'JPY'] : ['EUR', 'GBP', 'JPY']; // USD base first for the US and everywhere else
          return Object.fromEntries(home.filter((c) => r.rates[c]).map((c) => [`USD/${c}`, r.rates[c].toFixed(2)]));
        })
      : undefined,
  ]);

  return {
    ...(weather ? { weather } : {}),
    extras: { ...(onThisDay ? { onThisDay } : {}), ...(prayer ? { prayer } : {}), ...(markets && Object.keys(markets).length ? { markets } : {}) },
  };
}
