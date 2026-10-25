"use client";

import { useId, useRef, useState, type PointerEvent } from "react";
import { MAP_REGIONS, type MapRegion } from "./regions";
import { MapIconArt, PinMark } from "./MapIconArt";
import { MAP_WIDTH, MAP_HEIGHT, mapPiece } from "./mapLayout";
import "./busanMap.css";

type Props = { selected: string[]; counts: Record<string, number>; onToggle: (region: string) => void; onClear: () => void };

// 실제 경계는 유지한다. 작은 구는 이름만 표시하고 경계 자체를 키보드로도 선택한다.
export function BusanMap({ selected, counts, onToggle, onClear }: Props) {
  const [light, setLight] = useState<{ x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState<MapRegion | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pinDrops, setPinDrops] = useState<Record<string, number>>({});
  const pinSequence = useRef(0);
  const lightId = useId();
  const viewport = useRef<HTMLDivElement>(null);
  const follow = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    setLight({ x: (e.clientX - box.left + e.currentTarget.scrollLeft) / (box.width * zoom) * MAP_WIDTH,
      y: (e.clientY - box.top + e.currentTarget.scrollTop) / (box.height * zoom) * MAP_HEIGHT });
  };
  const toggle = (region: MapRegion) => {
    if ((counts[region.region] ?? 0) === 0) return;
    if (!selected.includes(region.region)) {
      const sequence = ++pinSequence.current;
      setPinDrops(previous => ({ ...previous, [region.region]: sequence }));
    }
    onToggle(region.region);
    setHovered(region);
  };
  const changeZoom = (next: number) => {
    const box = viewport.current;
    if (!box) return;
    const x = (box.scrollLeft + box.clientWidth / 2) / zoom;
    const y = (box.scrollTop + box.clientHeight / 2) / zoom;
    setZoom(next);
    requestAnimationFrame(() => {
      box.scrollLeft = x * next - box.clientWidth / 2;
      box.scrollTop = y * next - box.clientHeight / 2;
    });
  };
  const status = hovered
    ? `${hovered.name} · ${hovered.spot} 등 장소 ${counts[hovered.region] ?? 0}곳`
    : selected.length > 0 ? `조명 켜진 곳 ${selected.length}` : "구를 눌러 조명을 켜보세요";

  return (
    <div role="group" aria-label="부산 구·군 지도. 여러 곳을 고를 수 있어요" className="flex min-w-0 flex-col gap-2">
      <div ref={viewport} onPointerMove={follow} onPointerDown={follow}
        onPointerLeave={() => { setLight(null); setHovered(null); }} className="pd-map" data-zoom={zoom}
        >
        <svg role="group" aria-label="지도에서 구·군 선택" className="pd-map-svg" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}>
          <defs>
            <radialGradient id={lightId} gradientUnits="userSpaceOnUse" cx={light?.x ?? 0} cy={light?.y ?? 0} r="180">
              <stop offset="0%" stopColor="var(--color-light)" stopOpacity=".72" />
              <stop offset="42%" stopColor="var(--color-light)" stopOpacity=".32" />
              <stop offset="100%" stopColor="var(--color-light)" stopOpacity="0" />
            </radialGradient>
          </defs>
          {light && <circle aria-hidden="true" className="pd-map-cursor-light" cx={light.x} cy={light.y} r="180" fill={`url(#${lightId})`} />}
          {MAP_REGIONS.map(r => {
            const on = selected.includes(r.region), count = counts[r.region] ?? 0, piece = mapPiece(r.name);
            return <path key={r.region} d={piece.path} fillRule="evenodd" data-map-region={r.region}
              role="button" tabIndex={count > 0 ? 0 : -1} aria-pressed={on} aria-disabled={count === 0}
              aria-label={`${r.name}, ${r.spot} 등 장소 ${count}곳`}
              data-selected={on} data-disabled={count === 0}
              onClick={() => toggle(r)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!e.repeat) toggle(r); } }}
              onFocus={() => setHovered(r)}
              onPointerEnter={() => setHovered(r)} className={`pd-map-region ${on ? "pd-flick" : ""}`} vectorEffect="non-scaling-stroke">
              <title>{`${r.name} · ${r.spot} · 장소 ${count}곳`}</title>
            </path>;
          })}
          {light && <g aria-hidden="true" className="pd-map-cursor-light">
            {MAP_REGIONS.filter(r => !selected.includes(r.region) && (counts[r.region] ?? 0) > 0).map(r =>
              <path key={r.region} d={mapPiece(r.name).path} fillRule="evenodd" fill={`url(#${lightId})`} />)}
          </g>}
          {MAP_REGIONS.map(r => {
            const piece = mapPiece(r.name), on = selected.includes(r.region), [x, y] = piece.center;
            const pinY = piece.tiny ? -46 : piece.compact ? -49 : -62;
            return <g aria-hidden="true" key={r.region} transform={`translate(${x},${y})`} className="pd-map-label" data-selected={on} data-compact={piece.compact} data-tiny={piece.tiny}>
              <text y={piece.compact ? 5 : -8} textAnchor="middle" className="pd-map-name font-display">{r.name}</text>
              {!piece.compact && <svg x="-22" y="0" width="44" height="33" viewBox="0 0 32 24" overflow="visible"><MapIconArt icon={r.icon} className="pd-map-art" /></svg>}
              {on && <g key={pinDrops[r.region] ?? "saved"}>
                {pinDrops[r.region] !== undefined && <g>
                  <ellipse className="pd-map-pin-ring" cx="0" cy={pinY + 30} rx="15" ry="4.5" />
                  <ellipse className="pd-map-pin-ring pd-map-pin-ring-second" cx="0" cy={pinY + 30} rx="15" ry="4.5" />
                </g>}
                <g className={pinDrops[r.region] !== undefined ? "pd-map-pin-drop" : undefined}>
                  <svg data-map-pin="" x="-11" y={pinY} width="22" height="30" viewBox="0 0 14 18"><PinMark className="pd-map-pin" /></svg>
                </g>
              </g>}
            </g>;
          })}
        </svg>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={() => changeZoom(Math.max(1, zoom - 1))} disabled={zoom === 1} aria-label="지도 축소" className="flex min-h-tap min-w-tap items-center justify-center bg-room-cell text-xl text-on-room disabled:opacity-40">−</button>
        <span aria-live="polite" className="w-6 text-center text-xs text-on-room-muted">{zoom}×</span>
        <button type="button" onClick={() => changeZoom(Math.min(4, zoom + 1))} disabled={zoom === 4} aria-label="지도 확대" className="flex min-h-tap min-w-tap items-center justify-center bg-room-cell text-xl text-on-room disabled:opacity-40">+</button>
      </div>
      <div className="flex min-h-tap items-center justify-between gap-3">
        <p aria-live="polite" className="text-xs text-on-room-muted lg:text-[13px]">{status}</p>
        {selected.length > 0 && <button type="button" onClick={onClear} className="flex min-h-tap shrink-0 items-center px-1 text-[13px] font-semibold text-on-room">전체 해제</button>}
      </div>
      <p className="text-[11px] text-on-room-subtle">작은 구는 지도를 확대해서 골라보세요.</p>
      <a href="https://github.com/swcho/korea-maps" target="_blank" rel="noreferrer" className="inline-flex min-h-tap w-fit items-center text-[10px] text-on-room-subtle">지도 경계 SGIS(2020) · StatGarten</a>
    </div>
  );
}
