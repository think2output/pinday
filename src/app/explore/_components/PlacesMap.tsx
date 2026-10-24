"use client";

import { useEffect, useRef, useState } from "react";
import { loadKakaoMaps, type KakaoMaps, type MapInstance, type Clusterer } from "./kakao";
import type { Bounds, Place } from "./types";
import { canMapPlace } from "./mapCoordinates";

type Props = {
  places: Place[]; fitKey: string; selected: Place | null; candidates: string[];
  onSelect: (id: string) => void; onBounds: (bounds: Bounds) => void; onUnavailable: (failed: boolean) => void;
};

export function PlacesMap({ places, fitKey, selected, candidates, onSelect, onBounds, onUnavailable }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapInstance | null>(null);
  const api = useRef<KakaoMaps | null>(null);
  const clusterer = useRef<Clusterer | null>(null);
  const callbacks = useRef({ onSelect, onBounds, onUnavailable });
  const fitted = useRef("");
  const [attempt, setAttempt] = useState(0);
  const [readyVersion, setReadyVersion] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => { callbacks.current = { onSelect, onBounds, onUnavailable }; }, [onSelect, onBounds, onUnavailable]);

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    const element = container.current;
    loadKakaoMaps().then((maps) => {
      if (cancelled || !element) return;
      const instance = new maps.Map(element, { center: new maps.LatLng(35.18, 129.07), level: 9 });
      // 지도 위에서도 마우스 휠은 페이지를 스크롤한다. 확대·축소는 별도 버튼으로 제공한다.
      instance.setZoomable(false);
      const colors = getComputedStyle(document.documentElement);
      const clusters = new maps.MarkerClusterer({ map: instance, averageCenter: true, minLevel: 5, gridSize: 60,
        styles: [{ width: "44px", height: "44px", lineHeight: "44px", textAlign: "center", fontWeight: "700",
          background: colors.getPropertyValue("--color-room"), color: colors.getPropertyValue("--color-on-room") }] });
      map.current = instance;
      api.current = maps;
      clusterer.current = clusters;
      fitted.current = "";
      const idle = () => {
        if (!element.offsetWidth || !element.offsetHeight) return;
        const bounds = instance.getBounds();
        const sw = bounds.getSouthWest(), ne = bounds.getNorthEast();
        callbacks.current.onBounds({ west: sw.getLng(), south: sw.getLat(), east: ne.getLng(), north: ne.getLat() });
      };
      maps.event.addListener(instance, "idle", idle);
      const resize = new ResizeObserver(() => { instance.relayout(); idle(); });
      resize.observe(element);
      cleanup = () => {
        resize.disconnect();
        maps.event.removeListener(instance, "idle", idle);
        clusters.clear();
        map.current = null;
        api.current = null;
        clusterer.current = null;
        element.replaceChildren();
      };
      callbacks.current.onUnavailable(false);
      setReadyVersion((version) => version + 1);
      setStatus("ready");
    }).catch(() => {
      if (cancelled) return;
      callbacks.current.onUnavailable(true);
      setStatus("error");
    });
    return () => { cancelled = true; cleanup(); };
  }, [attempt]);

  useEffect(() => {
    const maps = api.current, instance = map.current, clusters = clusterer.current;
    if (status !== "ready" || !maps || !instance || !clusters) return;
    const colors = getComputedStyle(document.documentElement);
    const color = (name: string) => colors.getPropertyValue(`--color-${name}`).trim();
    const mappedPlaces = places.filter(canMapPlace);
    const markers = mappedPlaces.map((place) => {
      const active = selected?.id === place.id;
      const added = candidates.includes(place.id);
      const foreground = color(active ? "ink" : "on-room");
      const symbol = added
        ? `<path d="m16 18 4 4 8-9" fill="none" stroke="${foreground}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
        : `<circle cx="22" cy="18" r="5" fill="${foreground}"/>`;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><path d="M22 3C13.7 3 7 9.7 7 18c0 11 15 23 15 23s15-12 15-23C37 9.7 30.3 3 22 3Z" fill="${color(active ? "light" : "room")}" stroke="${color("bg")}" stroke-width="2"/>${symbol}</svg>`;
      const marker = new maps.Marker({ position: new maps.LatLng(place.lat, place.lng), title: place.name,
        image: new maps.MarkerImage(`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, new maps.Size(44, 44)) });
      const click = () => callbacks.current.onSelect(place.id);
      maps.event.addListener(marker, "click", click);
      return { marker, click };
    });
    clusters.clear();
    clusters.addMarkers(markers.map(({ marker }) => marker));
    if (mappedPlaces.length && fitted.current !== fitKey) {
      fitted.current = fitKey;
      const bounds = new maps.LatLngBounds();
      mappedPlaces.forEach((place) => bounds.extend(new maps.LatLng(place.lat, place.lng)));
      instance.setBounds(bounds, 44, 44, 100, 44);
      const sw = instance.getBounds().getSouthWest(), ne = instance.getBounds().getNorthEast();
      callbacks.current.onBounds({ west: sw.getLng(), south: sw.getLat(), east: ne.getLng(), north: ne.getLat() });
    }
    return () => {
      markers.forEach(({ marker, click }) => { maps.event.removeListener(marker, "click", click); marker.setMap(null); });
      clusters.clear();
    };
  }, [places, fitKey, candidates, selected?.id, status, readyVersion]);

  useEffect(() => {
    if (status !== "ready" || !selected || !canMapPlace(selected) || !map.current || !api.current) return;
    map.current.setLevel(3);
    map.current.panTo(new api.current.LatLng(selected.lat, selected.lng));
  }, [selected, status, readyVersion]);

  return (
    <>
      <div ref={container} role="region" aria-label="카카오 장소 지도. 같은 장소를 목록에서도 고를 수 있어요" className="absolute inset-0" />
      {status === "ready" && (
        <div role="group" aria-label="지도 확대·축소" className="absolute top-3 right-3 z-10 flex flex-col bg-bg shadow-paper">
          <button type="button" aria-label="지도 확대" onClick={() => {
            const instance = map.current;
            if (instance) instance.setLevel(Math.max(1, instance.getLevel() - 1));
          }} className="min-h-tap min-w-tap text-xl text-ink">+</button>
          <button type="button" aria-label="지도 축소" onClick={() => {
            const instance = map.current;
            if (instance) instance.setLevel(Math.min(14, instance.getLevel() + 1));
          }} className="min-h-tap min-w-tap text-xl text-ink">−</button>
        </div>
      )}
      {status !== "ready" && (
        <div role="status" className="absolute top-4 right-4 left-4 z-10 bg-bg p-4 text-sm text-ink-muted shadow-paper">
          {status === "loading" ? "부산 지도를 불러오고 있어요" : "지도를 불러오지 못했어요. 목록에서 장소를 고를 수 있어요."}
          {status === "error" && <button type="button" onClick={() => { setStatus("loading"); setAttempt((value) => value + 1); }} className="mt-1 block min-h-tap font-semibold text-ink">지도 다시 시도</button>}
        </div>
      )}
    </>
  );
}
