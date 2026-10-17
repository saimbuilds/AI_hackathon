// Papers are composed in English (Urdu is a translation of the English copy), so a story whose headline or
// text is still in another script (an un-enriched Al Jazeera Arabic item, say) must not reach an English page.
export function isMostlyLatin(text: string, min = 0.8): boolean {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (!letters.length) return true;
  const latin = letters.filter((c) => /\p{Script=Latin}/u.test(c)).length;
  return latin / letters.length >= min;
}
