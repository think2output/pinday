"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTrip } from "@/lib/trip/store";

// 상단 메뉴 (기획서 4장). 휴대폰은 옆으로 밀어 보는 한 줄, 현재 위치는 굵은 글자로만 표시.
const MENU = [
  { href: "/", label: "홈" },
  { href: "/explore", label: "어디 갈까?" },
  { href: "/schedule", label: "언제 갈까?" },
  { href: "/route", label: "어떻게 갈까?" },
  { href: "/weather", label: "날씨 대안" },
  { href: "/docent", label: "AI 도슨트" },
];

/** tone="room": 어두운 전시실 영역 위에 놓일 때 */
export function SiteHeader({ tone = "plain" }: { tone?: "plain" | "room" }) {
  const pathname = usePathname();
  const { trip } = useTrip();
  const onRoom = tone === "room";
  // 이동 규칙 1: 후보함이 비었으면 어디 갈까?, 하나라도 있으면 언제 갈까?
  const myTripHref = trip.candidates.length > 0 ? "/schedule" : "/explore";
  const isCurrent = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="lg:flex lg:h-19 lg:items-center lg:gap-12">
      <div className="flex h-13 items-center justify-between lg:h-auto">
        <Link
          href="/"
          className={`flex min-h-tap min-w-tap shrink-0 items-center gap-1.5 font-display text-[21px] font-extrabold tracking-[-0.045em] lg:text-2xl ${onRoom ? "text-on-room" : "text-ink"}`}
        >
          PinDay
          <span aria-hidden="true" className="size-1.5 rounded-full bg-light shadow-glow" />
        </Link>
        <Link
          href={myTripHref}
          className={`flex min-h-tap min-w-tap shrink-0 items-center px-0.5 text-sm font-semibold lg:hidden ${onRoom ? "text-on-room" : "text-ink"}`}
        >
          내 여행
        </Link>
      </div>
      <nav aria-label="주요 메뉴" className="no-scrollbar -mx-gutter flex gap-5 overflow-x-auto px-gutter whitespace-nowrap lg:mx-0 lg:flex-1 lg:gap-7 lg:px-0">
        {MENU.map((item) => {
          const current = isCurrent(item.href);
          const color = current
            ? onRoom ? "text-on-room font-extrabold" : "text-ink font-extrabold"
            : onRoom ? "text-on-room-subtle" : "text-ink-muted";
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={current ? "page" : undefined}
              className={`flex min-h-tap min-w-tap shrink-0 items-center text-sm lg:text-[15px] ${color}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Link
        href={myTripHref}
        className={`hidden min-h-tap min-w-tap shrink-0 items-center px-0.5 text-[15px] font-semibold lg:flex ${onRoom ? "text-on-room" : "text-ink"}`}
      >
        내 여행
      </Link>
    </header>
  );
}
