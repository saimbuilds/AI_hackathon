// Validates fixtures/edition.sample.json against the contract and checks citation indexes.
import { readFileSync } from 'node:fs';
import { EditionSchema, type StorySlot } from '../src/types/edition';

const edition = EditionSchema.parse(JSON.parse(readFileSync('fixtures/edition.sample.json', 'utf8')));

const slots: StorySlot[] = [
  edition.lead,
  ...edition.sections.flatMap((s) => s.slots),
  ...edition.offYourBeat,
  ...edition.briefs,
  ...edition.everyonesFrontPage,
];
for (const slot of slots) {
  for (const sentence of slot.body) {
    for (const n of sentence.sources) {
      if (n > slot.sources.length) throw new Error(`${slot.headline}: citation ${n} out of range`);
    }
  }
}
for (const quiz of [...edition.quiz, ...edition.dailyThree]) {
  if (quiz.answer >= quiz.options.length) throw new Error(`quiz answer out of range: ${quiz.q}`);
}
console.log(`contract ok: ${slots.length} slots, ${edition.threeThings.length} things, ${edition.dailyThree.length} daily3`);
