"use client";

import { useRef, useState, type PointerEvent } from "react";
import { MAP_REGIONS, type MapRegion } from "./regions";
import { MapIconArt, PinMark } from "./MapIconArt";
import { MAP_WIDTH, MAP_HEIGHT, mapPiece } from "./mapLayout";
import "./busanMap.css";

type Props = { selected: string[]; counts: Record<string, number>; onToggle: (region: string) => void; onClear: () => void };

// 실제 해안선과 행정 경계를 유지한다. 작은 구는 확대·이름 선택으로도 고를 수 있다.
export function BusanMap({ selected, counts, onToggle, onClear }: Props) {
  const [light, setLight] = useState<{ x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState<MapRegion | null>(null);
  const [zoom, setZoom] = useState(1);
  const viewport = useRef<HTMLDivElement>(null);
  const follow = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    setLight({ x: e.clientX - box.left, y: e.clientY - box.top });
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
        style={light ? { background: `radial-gradient(circle 150px at ${light.x}px ${light.y}px, color-mix(in srgb, var(--color-lit) 16%, transparent), transparent)` } : undefined}>
        {/* 키보드/화면 읽기용 선택은 아래 기본 select가 담당한다. 경계는 왜곡하지 않는다. */}
        <svg aria-hidden="true" className="pd-map-svg" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}>
          {MAP_REGIONS.map(r => {
            const on = selected.includes(r.region), count = counts[r.region] ?? 0, piece = mapPiece(r.name);
            return <path key={r.region} d={piece.path} fillRule="evenodd" data-map-region={r.region}
              data-selected={on} data-disabled={count === 0}
              onClick={() => { if (count > 0) { onToggle(r.region); setHovered(r); } }}
              onPointerEnter={() => setHovered(r)} className={`pd-map-region ${on ? "pd-flick" : ""}`} vectorEffect="non-scaling-stroke">
              <title>{`${r.name} · ${r.spot} · 장소 ${count}곳`}</title>
            </path>;
          })}
          {MAP_REGIONS.map(r => {
            const piece = mapPiece(r.name), on = selected.includes(r.region), [x, y] = piece.center;
            const width = piece.tiny ? 20 : piece.compact ? 30 : 44;
            return <g key={r.region} transform={`translate(${x},${y})`} className="pd-map-label" data-selected={on} data-compact={piece.compact} data-tiny={piece.tiny}>
              <text y={piece.compact && zoom === 1 ? 5 : piece.tiny ? -4 : -8} textAnchor="middle" className="pd-map-name font-display">{r.name}</text>
              <svg x={-width / 2} y={0} width={width} height={width * .75} viewBox="0 0 32 24" overflow="visible"><MapIconArt icon={r.icon} className="pd-map-art" /></svg>
              {on && <svg x={piece.tiny ? 12 : 23} y={piece.tiny ? -19 : -27} width="11" height="15" viewBox="0 0 14 18"><PinMark className="pd-map-pin" /></svg>}
            </g>;
          })}
        </svg>
      </div>
      <div className="flex items-center gap-2">
        <select value="" aria-label="구·군 이름으로 선택 또는 해제"
          className="min-h-tap min-w-0 flex-1 appearance-auto rounded-control bg-room-cell px-3 text-sm text-on-room"
          onChange={e => { const region = MAP_REGIONS.find(r => r.region === e.target.value); if (region) { onToggle(region.region); setHovered(region); } }}>
          <option value="" disabled className="bg-room">이름으로 선택·해제</option>
          {MAP_REGIONS.map(r => <option key={r.region} value={r.region} disabled={(counts[r.region] ?? 0) === 0} className="bg-room">{`${selected.includes(r.region) ? "✓ " : ""}${r.name} · ${r.spot}`}</option>)}
        </select>
        <button type="button" onClick={() => changeZoom(Math.max(1, zoom - 1))} disabled={zoom === 1} aria-label="지도 축소" className="flex min-h-tap min-w-tap items-center justify-center bg-room-cell text-xl text-on-room disabled:opacity-40">−</button>
        <span aria-live="polite" className="w-6 text-center text-xs text-on-room-muted">{zoom}×</span>
        <button type="button" onClick={() => changeZoom(Math.min(4, zoom + 1))} disabled={zoom === 4} aria-label="지도 확대" className="flex min-h-tap min-w-tap items-center justify-center bg-room-cell text-xl text-on-room disabled:opacity-40">+</button>
      </div>
      <div className="flex min-h-tap items-center justify-between gap-3">
        <p aria-live="polite" className="text-xs text-on-room-muted lg:text-[13px]">{status}</p>
        {selected.length > 0 && <button type="button" onClick={onClear} className="flex min-h-tap shrink-0 items-center px-1 text-[13px] font-semibold text-on-room">전체 해제</button>}
      </div>
      <p className="text-[11px] text-on-room-subtle">작은 구는 지도를 확대하거나 이름으로 골라보세요.</p>
      <a href="https://github.com/swcho/korea-maps" target="_blank" rel="noreferrer" className="inline-flex min-h-tap w-fit items-center text-[10px] text-on-room-subtle">지도 경계 SGIS(2020) · StatGarten</a>
    </div>
  );
}
