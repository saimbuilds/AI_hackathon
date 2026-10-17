import sample from "../../../fixtures/edition.sample.json";
import { EditionSchema, type Edition } from "@/types/edition";

// Landing + offline demo data. Validated against the contract so a fixture drift fails loudly at build.
export function getSampleEdition(): Edition {
  return EditionSchema.parse(sample);
}
