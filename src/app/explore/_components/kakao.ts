// 탐색 화면에서 쓰는 카카오 지도 JS SDK의 공개 API만 정의한다.
// 공식 가이드: https://apis.map.kakao.com/web/guide/
export type LatLng = { getLat(): number; getLng(): number };
export type LatLngBounds = { extend(point: LatLng): void; getSouthWest(): LatLng; getNorthEast(): LatLng };
export type MapInstance = {
  setBounds(bounds: LatLngBounds, top?: number, right?: number, bottom?: number, left?: number): void;
  getBounds(): LatLngBounds; getLevel(): number; setLevel(level: number): void; setZoomable(zoomable: boolean): void; panTo(point: LatLng): void; relayout(): void;
};
export type Marker = { setMap(map: MapInstance | null): void };
export type Clusterer = { addMarkers(markers: Marker[]): void; clear(): void };
export type KakaoMaps = {
  load(callback: () => void): void;
  LatLng: new (lat: number, lng: number) => LatLng;
  LatLngBounds: new () => LatLngBounds;
  Map: new (container: HTMLElement, options: { center: LatLng; level: number }) => MapInstance;
  Marker: new (options: { position: LatLng; title: string; image: unknown }) => Marker;
  MarkerImage: new (src: string, size: unknown) => unknown;
  Size: new (width: number, height: number) => unknown;
  MarkerClusterer: new (options: { map: MapInstance; averageCenter: boolean; minLevel: number; gridSize: number; styles: Record<string, string>[] }) => Clusterer;
  event: { addListener(target: object, event: string, handler: () => void): void; removeListener(target: object, event: string, handler: () => void): void };
};
declare global { interface Window { kakao?: { maps: KakaoMaps } } }

let sdk: Promise<KakaoMaps> | null = null;
export function loadKakaoMaps(): Promise<KakaoMaps> {
  if (window.kakao?.maps.Map && window.kakao.maps.MarkerClusterer) return Promise.resolve(window.kakao.maps);
  if (sdk) return sdk;
  const key = process.env.NEXT_PUBLIC_KAKAO_MAP_JS_KEY;
  if (!key) return Promise.reject(new Error("map-key-missing"));
  sdk = new Promise<KakaoMaps>((resolve, reject) => {
    const script = document.createElement("script");
    const timer = setTimeout(fail, 12_000);
    function fail() {
      clearTimeout(timer);
      script.remove();
      reject(new Error("map-unavailable"));
    }
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key!)}&autoload=false&libraries=clusterer`;
    script.async = true;
    script.onerror = fail;
    script.onload = () => {
      if (!window.kakao?.maps.load) { fail(); return; }
      window.kakao.maps.load(() => {
        if (!window.kakao?.maps.Map || !window.kakao.maps.MarkerClusterer) { fail(); return; }
        clearTimeout(timer);
        resolve(window.kakao.maps);
      });
    };
    document.head.appendChild(script);
  }).catch((error) => { sdk = null; throw error; });
  return sdk;
}
