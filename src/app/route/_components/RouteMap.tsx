"use client";

import { useEffect, useRef, useState } from "react";
import { loadKakaoMaps, type KakaoMaps, type LatLng, type MapInstance } from "../../explore/_components/kakao";
import type { SchedulePlace } from "../../schedule/_components/scheduleModel";

// 카카오 지도 JS SDK 공개 API 중 길찾기 지도에서 더 쓰는 부분 (https://apis.map.kakao.com/web/documentation/)
type Overlay = { setMap(map: MapInstance | null): void };
type RouteMaps = KakaoMaps & {
  CustomOverlay: new (options: { position: LatLng; content: HTMLElement; xAnchor?: number; yAnchor?: number; zIndex?: number }) => Overlay;
  Polyline: new (options: { path: LatLng[]; strokeWeight: number; strokeColor: string; strokeOpacity: number; strokeStyle: string }) => Overlay;
};

export type MapLeg = { lines: { type: string; points: [number, number][] }[]; from: SchedulePlace; to: SchedulePlace };

export function RouteMap({ stops, legs, focus, label }: { stops: { no: number; place: SchedulePlace }[]; legs: (MapLeg | null)[]; focus: number | null; label: string }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapInstance | null>(null);
  const api = useRef<RouteMaps | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    const element = container.current;
    loadKakaoMaps().then((loaded) => {
      if (cancelled || !element) return;
      api.current = loaded as RouteMaps;
      map.current = new loaded.Map(element, { center: new loaded.LatLng(35.18, 129.07), level: 9 });
      map.current.setZoomable(false);
      setStatus("ready");
    }).catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; element?.replaceChildren(); };
  }, []);

  useEffect(() => {
    const maps = api.current, instance = map.current;
    if (status !== "ready" || !maps || !instance) return;
    const css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue("--color-room").trim();
    const light = css.getPropertyValue("--color-light").trim();
    const at = (lat: number, lng: number) => new maps.LatLng(lat, lng);
    const overlays: Overlay[] = [];
    const bounds = new maps.LatLngBounds();

    legs.forEach((leg, index) => {
      if (!leg) return;
      const on = focus === index;
      const dim = focus !== null && !on;
      const draw = (path: LatLng[], dotted: boolean) => {
        path.forEach((point) => bounds.extend(point));
        if (on) overlays.push(new maps.Polyline({ path, strokeWeight: 9, strokeColor: ink, strokeOpacity: 1, strokeStyle: "solid" }));
        overlays.push(new maps.Polyline({
          path, strokeWeight: on ? 5 : dotted ? 3 : 4, strokeColor: on ? light : ink,
          strokeOpacity: dim ? 0.25 : 0.9, strokeStyle: dotted && !on ? "shortdot" : "solid",
        }));
      };
      const first = leg.lines[0]?.points[0], last = leg.lines.at(-1)?.points.at(-1);
      if (first) draw([at(leg.from.lat, leg.from.lng), at(first[0], first[1])], true);
      leg.lines.forEach((line) => draw(line.points.map(([lat, lng]) => at(lat, lng)), line.type === "WALKING"));
      if (last) draw([at(last[0], last[1]), at(leg.to.lat, leg.to.lng)], true);
    });

    stops.forEach((stop) => {
      const pin = document.createElement("span");
      pin.className = "grid size-8 place-items-center bg-room font-display text-sm font-bold text-on-room shadow-paper ring-2 ring-bg";
      pin.textContent = String(stop.no);
      const point = at(stop.place.lat, stop.place.lng);
      bounds.extend(point);
      overlays.push(new maps.CustomOverlay({ position: point, content: pin, xAnchor: 0.5, yAnchor: 0.5, zIndex: 3 }));
    });

    overlays.forEach((overlay) => overlay.setMap(instance));
    if (stops.length) instance.setBounds(bounds, 40, 56, 40, 40);
    return () => overlays.forEach((overlay) => overlay.setMap(null));
  }, [stops, legs, focus, status]);

  return (
    <>
      <div ref={container} role="region" aria-label={label} className="absolute inset-0" />
      {status !== "ready" && (
        <p role="status" className="absolute top-3 right-3 left-3 z-10 bg-bg p-4 text-sm text-ink-muted shadow-paper">
          {status === "loading" ? "지도를 불러오고 있어요" : "지도를 불러오지 못했어요. 구간은 목록에서 볼 수 있어요."}
        </p>
      )}
    </>
  );
}
