import "server-only";

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { getPlace } from "./places";

type Sentence = { text: string; sources: number[] };
export type DocentSource = { n: number; sourceId: string; provider: string; title: string; url: string; text: string };
export type Docent = {
  placeId: string;
  placeName: string;
  region: string;
  category: string;
  lat: number;
  lng: number;
  image: { url: string; license: string } | null;
  generatedOn: string;
  reviewedOn: string;
  sources: DocentSource[];
  notes: string[];
  draft: {
    summary: Sentence[]; history: Sentence[]; neighborhood: Sentence[]; beforeVisit: Sentence[];
    points: { title: string; sentences: Sentence[] }[]; narration: string;
  };
};

const kstDate = (iso: string) => new Date(Date.parse(iso) + 9 * 3600_000).toISOString().slice(0, 10);

/** 사람 검수에서 공개 승인된 해설만 읽는다(data/docent/README.md "해설 초안") */
function load(): Docent[] {
  const dir = path.join(process.cwd(), "data/docent/drafts");
  let files: string[] = [];
  try { files = readdirSync(dir).filter((file) => file.endsWith(".json")); } catch { return []; }
  return files.flatMap((file) => {
    const saved = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
    if (saved.publishable !== true || saved.humanReview?.status !== "approved" || saved.checks?.issues?.length) return [];
    const place = getPlace(saved.placeId);
    if (!place) return [];
    return [{
      placeId: place.id, placeName: place.name, region: place.region, category: place.category, lat: place.lat, lng: place.lng,
      image: place.image ? { url: place.image.url, license: place.image.license } : null,
      generatedOn: kstDate(saved.generatedAt), reviewedOn: saved.humanReview.reviewedOn,
      sources: saved.sources.map(({ n, sourceId, provider, title, url, text }: DocentSource) => ({ n, sourceId, provider, title, url, text })),
      notes: saved.display?.notes ?? [],
      draft: saved.draft,
    }];
  }).sort((a, b) => a.placeName.localeCompare(b.placeName, "ko"));
}

const docents = load();

export function listDocents(): Docent[] {
  return docents;
}

export function getDocent(placeId: string): Docent | undefined {
  return docents.find((docent) => docent.placeId === placeId);
}
