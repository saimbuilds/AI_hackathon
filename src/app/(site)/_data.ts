import sample from "../../../fixtures/edition.sample.json";
import { EditionSchema, type Edition } from "@/types/edition";

// Landing + offline demo data. Validated against the contract so a fixture drift fails loudly at build.
// The fixture is a sample reader's edition; the public sample drops that reader's name.
export function getSampleEdition(): Edition {
  const e = EditionSchema.parse(sample);
  const name = e.paperName.replace(/^The\s+|\s+Times$/g, "");
  const note = e.editorNote.replace(new RegExp(`\b${name},\s*`, "g"), "").replace(new RegExp(`\b${name}\b`, "g"), "you");
  return { ...e, paperName: "The Morning Paper", editorNote: note.charAt(0).toUpperCase() + note.slice(1) };
}
