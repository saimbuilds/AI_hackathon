"use client";

import type { Edition } from "@/types/edition";
import { Reader } from "@/components/reader/Reader";
import { Ending } from "@/components/ending/Ending";
import { EditionLoader } from "./EditionLoader";

export function PaperScreen({ sample }: { sample: Edition }) {
  return <EditionLoader sample={sample}>{(e) => <Reader key={e.id} edition={e} />}</EditionLoader>;
}

export function EndScreen({ sample }: { sample: Edition }) {
  return <EditionLoader sample={sample}>{(e, isSample) => <Ending key={e.id} edition={e} canSave={!isSample} />}</EditionLoader>;
}
