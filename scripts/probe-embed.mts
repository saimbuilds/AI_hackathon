// Dev probe: how are cosine similarities distributed for same-event vs unrelated headlines?
import { embed, dot } from '../src/press/embed';

const groups: Record<string, string[]> = {
  sanctions: [
    'Trump waives new Russia sanctions as row with Zelensky intensifies',
    'Trump waives new Russia sanctions as Ukraine ties slump',
    'Trump puts new Russia sanctions on hold',
    'ٹرمپ نے روس پر نئی پابندیاں معطل کر دیں',
    'ترامب يعلق عقوبات جديدة على روسيا',
  ],
  amazon: [
    'Brazil sees record fall in Amazon deforestation as key election looms',
    'Brazil: Amazon deforestation lowest in nearly 40 years',
  ],
  oregon: [
    'Oregon teacher fought school attacker before armed dad shot suspect',
    'Oregon school shooting: Police praise heroism of those who intervened',
  ],
  other: [
    'Brazilian Camara to join Haas for F1 debut in 2027',
    'DISCOs seek Rs2.6/unit hike for Sept',
    'OpenAI models hacked a crypto wallet and breached more websites',
    'Pakistan to chair IMF, WB boards in 2027',
    'Red Bull F1 boss Mekies gets new deal to 2031',
    'Trump says US economy is booming as markets hit record',
    'Fed holds interest rates steady amid inflation worries',
  ],
};
const all = Object.entries(groups).flatMap(([g, ts]) => ts.map((t) => ({ g, t })));
const t0 = Date.now();
const vecs = await embed(all.map((x) => x.t));
console.log(`embedded ${all.length} in ${Date.now() - t0}ms (incl. model load)`);

const same: number[] = [], diff: number[] = [];
for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
  const s = dot(vecs[i], vecs[j]);
  (all[i].g === all[j].g && all[i].g !== 'other' ? same : diff).push(s);
}
const stat = (a: number[]) => `min ${Math.min(...a).toFixed(3)} median ${a.sort((x, y) => x - y)[a.length >> 1].toFixed(3)} max ${Math.max(...a).toFixed(3)}`;
console.log('same event :', stat(same));
console.log('different  :', stat(diff));
