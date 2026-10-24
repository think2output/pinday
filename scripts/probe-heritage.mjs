// 전체 수집 전에 대표 장소 3곳에서 국가유산 XML/좌표/설명을 시험한다.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { heritageList, nearbyHeritage, detailUrl, request, heritageKey } from "./lib/docent-evidence.mjs";

const places = JSON.parse(await readFile("data/places/places.json", "utf8"));
const { items, pages } = await heritageList();
const results = [];
for (const name of ["범어사(부산)", "25의용단", "해운대해수욕장"]) {
  const place = places.find((p) => p.name === name);
  if (!place) throw new Error(`시험 장소 없음: ${name}`);
  const near = nearbyHeritage(place, items);
  const samples = [];
  for (const { item, distance } of near.slice(0, 2)) {
    const url = detailUrl(item);
    const { data, raw } = await request(url);
    if (!data.item?.ccbaMnm1 || !data.item?.content) throw new Error("상세 이름/설명 없음");
    samples.push({ id: heritageKey(item), name: data.item.ccbaMnm1, distanceMeters: Math.round(distance), url, excerpt: data.item.content.slice(0, 180), rawXml: raw });
  }
  results.push({ placeId: place.id, name, nearbyCount: near.length, samples });
}
await mkdir("data/docent", { recursive: true });
await writeFile("data/docent/heritage-probe.json", JSON.stringify({ checkedAt: new Date().toISOString(), totalHeritage: items.length, invalidCoordinates: items.filter((i) => !Number(i.latitude) || !Number(i.longitude)).length, listRequest: pages[0].url, results }, null, 2) + "\n");
console.log(JSON.stringify(results.map(({ samples, ...rest }) => ({ ...rest, samples: samples.map(({ id, name, distanceMeters, url, excerpt }) => ({ id, name, distanceMeters, url, excerpt })) })), null, 2));
