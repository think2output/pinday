"use client";

import { useEffect, useRef, useState } from "react";
import { loadKakaoMaps, type KakaoMaps, type LatLng, type MapInstance } from "../../explore/_components/kakao";
import type { SchedulePlace } from "./scheduleModel";

// 카카오 지도 JS SDK 공개 API 중 일정 지도에서 더 쓰는 부분 (https://apis.map.kakao.com/web/documentation/)
type Overlay = { setMap(map: MapInstance | null): void };
type ScheduleMaps = KakaoMaps & {
  CustomOverlay: new (options: { position: LatLng; content: HTMLElement; xAnchor?: number; yAnchor?: number; zIndex?: number }) => Overlay;
  Polyline: new (options: { path: LatLng[]; strokeWeight: number; strokeColor: string; strokeOpacity: number; strokeStyle: string }) => Overlay;
};
type ScheduleMapInstance = MapInstance & { setCenter(point: LatLng): void };

type Stop = { no: number; place: SchedulePlace };

export function ScheduleMap({ stops, nearby, label }: { stops: Stop[]; nearby: { place: SchedulePlace }[]; label: string }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<ScheduleMapInstance | null>(null);
  const api = useRef<ScheduleMaps | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [readyVersion, setReadyVersion] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    const element = container.current;
    loadKakaoMaps().then((loaded) => {
      if (cancelled || !element) return;
      const maps = loaded as ScheduleMaps;
      const instance = new maps.Map(element, { center: new maps.LatLng(35.18, 129.07), level: 9 }) as ScheduleMapInstance;
      // 지도 위 마우스 휠은 페이지를 스크롤한다. 확대·축소는 버튼으로 제공한다.
      instance.setZoomable(false);
      map.current = instance;
      api.current = maps;
      const resize = new ResizeObserver(() => instance.relayout());
      resize.observe(element);
      cleanup = () => {
        resize.disconnect();
        map.current = null;
        api.current = null;
        element.replaceChildren();
      };
      setReadyVersion((version) => version + 1);
      setStatus("ready");
    }).catch(() => {
      if (!cancelled) setStatus("error");
    });
    return () => { cancelled = true; cleanup(); };
  }, [attempt]);

  useEffect(() => {
    const maps = api.current, instance = map.current;
    if (status !== "ready" || !maps || !instance) return;
    const color = getComputedStyle(document.documentElement).getPropertyValue("--color-room").trim();
    const points = stops.map((stop) => new maps.LatLng(stop.place.lat, stop.place.lng));
    const overlays: Overlay[] = stops.map((stop, index) => {
      const pin = document.createElement("span");
      pin.className = "grid size-8 place-items-center bg-room font-display text-sm font-bold text-on-room shadow-paper ring-2 ring-bg";
      pin.textContent = String(stop.no);
      pin.title = `${stop.no}. ${stop.place.name}`;
      return new maps.CustomOverlay({ position: points[index], content: pin, xAnchor: 0.5, yAnchor: 0.5, zIndex: 2 });
    });
    nearby.forEach(({ place }) => {
      const dot = document.createElement("span");
      dot.className = "block size-4 rounded-full bg-bg shadow-paper ring-2 ring-ink-muted";
      dot.title = `근처 추천: ${place.name}`;
      overlays.push(new maps.CustomOverlay({ position: new maps.LatLng(place.lat, place.lng), content: dot, xAnchor: 0.5, yAnchor: 0.5, zIndex: 1 }));
    });
    if (points.length > 1) {
      overlays.unshift(new maps.Polyline({ path: points, strokeWeight: 2, strokeColor: color, strokeOpacity: 0.8, strokeStyle: "shortdash" }));
    }
    overlays.forEach((overlay) => overlay.setMap(instance));
    const framed = points.length ? [...points, ...nearby.map(({ place }) => new maps.LatLng(place.lat, place.lng))] : [];
    if (framed.length > 1) {
      const bounds = new maps.LatLngBounds();
      framed.forEach((point) => bounds.extend(point));
      instance.setBounds(bounds, 40, 72, 40, 40);
    } else if (points.length === 1) {
      instance.setLevel(5);
      instance.setCenter(points[0]);
    } else {
      instance.setLevel(9);
      instance.setCenter(new maps.LatLng(35.18, 129.07));
    }
    return () => overlays.forEach((overlay) => overlay.setMap(null));
  }, [stops, nearby, status, readyVersion]);

  return (
    <>
      <div ref={container} role="region" aria-label={label} className="absolute inset-0" />
      {status === "ready" && (
        <div role="group" aria-label="지도 확대·축소" className="absolute top-3 right-3 z-10 flex flex-col bg-bg shadow-paper">
          <button type="button" aria-label="지도 확대" onClick={() => { const instance = map.current; if (instance) instance.setLevel(Math.max(1, instance.getLevel() - 1)); }} className="min-h-tap min-w-tap text-xl text-ink">+</button>
          <button type="button" aria-label="지도 축소" onClick={() => { const instance = map.current; if (instance) instance.setLevel(Math.min(14, instance.getLevel() + 1)); }} className="min-h-tap min-w-tap text-xl text-ink">−</button>
        </div>
      )}
      {status !== "ready" && (
        <div role="status" className="absolute top-3 right-3 left-3 z-10 bg-bg p-4 text-sm text-ink-muted shadow-paper">
          {status === "loading" ? "지도를 불러오고 있어요" : "지도를 불러오지 못했어요. 일정은 목록에서 그대로 바꿀 수 있어요."}
          {status === "error" && <button type="button" onClick={() => { setStatus("loading"); setAttempt((value) => value + 1); }} className="mt-1 block min-h-tap font-semibold text-ink">지도 다시 시도</button>}
        </div>
      )}
    </>
  );
}
