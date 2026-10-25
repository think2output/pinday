import boundaries from "../../../data/maps/busan-boundaries.json";

// SGIS 2020 경계를 SVG로 변환한 StatGarten 자료. 경로·섬·상대 크기를 그대로 사용한다.
// 출처와 MIT 라이선스: data/maps/README.md, data/maps/LICENSE
export const MAP_WIDTH = boundaries.width;
export const MAP_HEIGHT = boundaries.height;

export function mapPiece(name: string) {
  const piece = boundaries.regions.find(r => r.name === name);
  if (!piece) throw new Error(`부산 지도 경계 없음: ${name}`);
  return { ...piece, compact: piece.area < 5000, tiny: piece.area < 1500 };
}
