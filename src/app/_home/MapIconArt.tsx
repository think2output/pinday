import type { MapIcon } from "./regions";

// 지도 칸 선 그림 (광안대교·태종대 등대·감천마을). 선 색은 글자색(currentColor)을 따른다.
const PATHS: Record<MapIcon, string> = {
  bridge: "M1 16H31M10 16V4M22 16V4M1 10Q6 9 10 4Q16 12 22 4Q26 9 31 10M4 21H8M14 21H19M25 21H28",
  lighthouse: "M12 21L13.6 9H17.4L19 21M13.6 9V5H17.4V9M13 5L15.5 2L18 5M13 14H18.3M19.5 6L26 4M19.5 8L26 10M5 21H27",
  houses: "M2 21V16H8V21M9 21V12H15V21M16 21V9H22V21M23 21V5H30V21M1 21H31M4.5 18.5H5.5M11.5 15H12.5M18.5 12H19.5M26 8.5H27",
};

export function MapIconArt({ icon, className }: { icon: MapIcon; className?: string }) {
  return (
    <svg
      viewBox="0 0 32 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={PATHS[icon]} />
    </svg>
  );
}

/** 지도 핀 */
export function PinMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 14 18" aria-hidden="true" className={className}>
      <path
        d="M7 1C3.7 1 1 3.6 1 6.9 1 11.2 7 17 7 17s6-5.8 6-10.1C13 3.6 10.3 1 7 1z"
        fill="var(--color-light)"
        stroke="var(--color-ink)"
        strokeWidth="1.4"
      />
      <circle cx="7" cy="7" r="2.2" fill="var(--color-ink)" />
    </svg>
  );
}
