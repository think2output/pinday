// 부산 주변을 크게 잡은 표시 범위다. 행정 경계 판정이 아니라 원본 좌표 오류의 지도 확대 방지용이다.
export function canMapPlace(place: { lat: number; lng: number }): boolean {
  return Number.isFinite(place.lat) && Number.isFinite(place.lng) &&
    place.lat >= 34 && place.lat <= 36 && place.lng >= 128 && place.lng <= 130;
}
