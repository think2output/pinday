"use client";

import { useState, type PointerEvent } from "react";
import { MAP_REGIONS, type MapRegion } from "./regions";
import { MapIconArt, PinMark } from "./MapIconArt";

type Props = {
  selected: string[];
  counts: Record<string, number>;
  onToggle: (region: string) => void;
  onClear: () => void;
};

// 홈 블록 지도 (기획서 6-1, 시안 C). 커서(휴대폰은 누른 자리)를 따라다니는 조명 + 누르면 조명이 켜지고 핀이 꽂힘.
export function BusanMap({ selected, counts, onToggle, onClear }: Props) {
  const [light, setLight] = useState<{ x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState<MapRegion | null>(null);

  const follow = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    setLight({ x: e.clientX - box.left, y: e.clientY - box.top });
  };
  const leave = () => {
    setLight(null);
    setHovered(null);
  };

  const status = hovered
    ? `${hovered.name} · ${hovered.spot} 등 장소 ${counts[hovered.region] ?? 0}곳`
    : selected.length > 0
      ? `조명 켜진 곳 ${selected.length}`
      : "구를 눌러 조명을 켜보세요";

  return (
    <div className="flex flex-col gap-2 lg:gap-2">
      <div
        onPointerMove={follow}
        onPointerDown={follow}
        onPointerLeave={leave}
        role="group"
        aria-label="부산 구·군 지도. 여러 곳을 고를 수 있어요"
        className="relative grid grid-cols-4 grid-rows-[repeat(5,66px)] gap-0.75 lg:grid-rows-[repeat(5,92px)] lg:gap-1"
        style={
          light
            ? { background: `radial-gradient(circle 150px at ${light.x}px ${light.y}px, color-mix(in srgb, var(--color-lit) 30%, transparent), transparent)` }
            : undefined
        }
      >
        {MAP_REGIONS.map((r) => {
          const on = selected.includes(r.region);
          const count = counts[r.region] ?? 0;
          return (
            <div key={r.region} className="relative" style={{ gridColumn: r.col, gridRow: r.row }}>
              {on && (
                <div
                  aria-hidden="true"
                  className="pd-ignite pointer-events-none absolute -inset-7 rounded-full lg:-inset-10"
                  style={{ background: "radial-gradient(closest-side, color-mix(in srgb, var(--color-light) 35%, transparent), transparent)" }}
                />
              )}
              <button
                type="button"
                disabled={count === 0}
                aria-pressed={on}
                aria-label={`${r.name}, ${r.spot} 등 장소 ${count}곳`}
                onClick={() => onToggle(r.region)}
                onPointerEnter={() => setHovered(r)}
                onFocus={() => setHovered(r)}
                onBlur={() => setHovered(null)}
                className={`relative flex size-full flex-col justify-between rounded-control p-2.25 text-left transition-[background-color,box-shadow] duration-300 disabled:opacity-40 lg:p-3.5 ${
                  on ? "pd-flick bg-lit text-ink shadow-glow" : "bg-room-cell text-on-room"
                }`}
              >
                <span className={`font-display text-sm tracking-[-0.03em] lg:text-[17px] ${on ? "font-extrabold" : "font-semibold"}`}>
                  {r.name}
                </span>
                {/* 선 그림이 있는 칸은 조명이 켜지면 명소 이름 대신 그림이 나타난다 */}
                {on && r.icon ? (
                  <MapIconArt icon={r.icon} className="h-7.5 w-10 text-lit-ink lg:h-10.5 lg:w-14" />
                ) : (
                  <span className={`text-[10px] leading-tight lg:text-xs ${on ? "text-ink-muted" : "text-on-room-subtle"}`}>{r.spot}</span>
                )}
                {on && <PinMark className="absolute top-2 right-2 h-3.75 w-2.75 lg:top-3 lg:right-3 lg:h-4.5 lg:w-3.5" />}
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex min-h-tap items-center justify-between gap-4">
        <p aria-live="polite" className="text-xs text-on-room-muted lg:text-[13px]">
          {status}
        </p>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="flex min-h-tap shrink-0 items-center gap-1.5 px-0.5 text-[13px] font-semibold text-on-room lg:text-sm"
          >
            <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3">
              <path d="M2 6a4 4 0 1 0 1.2-2.9M2 1.5v2.6h2.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            전체 해제
          </button>
        )}
      </div>
    </div>
  );
}
