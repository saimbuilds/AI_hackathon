// Print layout safety net: a fixed A4 frame can't grow, so instead of clipping a story mid-sentence we
// shorten the longest story by a sentence (down to two) and, once everything is short, drop whole stories
// from the end (they stay in the web edition) until every `[data-fit]` box on the sheet fits. Sections on one
// sheet share its height, so a shared sheet trims across all its sections, last section first.
// Runs after fonts load and whenever large print flips.

const over = (el: HTMLElement) => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
const visible = (el: HTMLElement) => el.style.display !== "none";
const MIN_SENTENCES = 2;

function trimOne(boxes: HTMLElement[]): boolean {
  const stories = boxes.flatMap((b) => [...b.querySelectorAll<HTMLElement>(".story")]).filter(visible);
  const spans = (s: HTMLElement) => [...s.querySelectorAll<HTMLElement>(".just > span")].filter(visible);
  // 1. Shorten the longest story, the later one on ties.
  let longest: HTMLElement | null = null;
  for (const s of stories) if (spans(s).length > MIN_SENTENCES && (!longest || spans(s).length >= spans(longest).length)) longest = s;
  if (longest) {
    const sp = spans(longest);
    sp[sp.length - 1].style.display = "none";
    return true;
  }
  // 2. Drop the last story, keeping at least one per box.
  for (const b of [...boxes].reverse()) {
    const v = [...b.querySelectorAll<HTMLElement>(".story")].filter(visible);
    if (v.length > 1) {
      v[v.length - 1].style.display = "none";
      return true;
    }
  }
  // 3. Last resort (large print, Nastaliq): one sentence per story.
  const last = [...stories].reverse().find((s) => spans(s).length > 1);
  if (last) {
    const sp = spans(last);
    sp[sp.length - 1].style.display = "none";
    return true;
  }
  return false;
}

function fitSheet(sheet: HTMLElement) {
  sheet.querySelectorAll<HTMLElement>("[data-fit-group], [data-fit] h2, .story, .just > span").forEach((el) => (el.style.display = ""));
  const boxes = [...sheet.querySelectorAll<HTMLElement>("[data-fit]")];
  const shared = !!sheet.querySelector("[data-fit-group]");
  for (let guard = 0; guard < 120; guard++) {
    const live = boxes.filter((b) => b.offsetParent);
    const bad = live.filter(over);
    if (!bad.length && !over(sheet)) break;
    // A section squeezed to nothing goes entirely.
    const squeezed = bad.find((b) => b.clientHeight < 40 && b.closest("[data-fit-group]"));
    if (squeezed) {
      (squeezed.closest("[data-fit-group]") as HTMLElement).style.display = "none";
      continue;
    }
    if (!trimOne(shared || !bad.length ? live : bad)) break;
  }
  // No headings over empty space.
  for (const b of boxes)
    b.querySelectorAll<HTMLElement>("h2").forEach((h) => {
      let n = h.nextElementSibling as HTMLElement | null;
      while (n && n.tagName !== "H2" && !(n.classList.contains("story") && visible(n))) n = n.nextElementSibling as HTMLElement | null;
      if (!n || n.tagName === "H2") h.style.display = "none";
    });
}

export function fitSheets(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>(".sheet").forEach(fitSheet);
}
