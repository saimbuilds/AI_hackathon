// The product name lives here only. Rename = edit this file (+ package.json "name").
// Frontend and print import from here; never hardcode the name in copy.
export const BRAND = {
  name: 'Fold',
  tagline: 'The morning paper, folded for one.',
  // "The Saim Times" style masthead; the reader's own name wins over the brand.
  defaultPaperName: (readerName?: string | null) =>
    readerName ? `The ${readerName} Times` : 'The Morning Paper',
} as const;
