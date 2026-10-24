"use client";

type Props = {
  day: number;
  dayTotal: number;
  index: number;
  count: number;
  variant: "inline" | "sheet";
  onMoveDay: (day: number) => void;
  onShift: (toIndex: number) => void;
  onRemove: () => void;
};

/** ⋯ 메뉴 항목. 데스크톱은 장소 아래 펼침, 휴대폰은 아래에서 올라오는 창에서 같은 항목을 쓴다 */
export function PlaceActions({ day, dayTotal, index, count, variant, onMoveDay, onShift, onRemove }: Props) {
  const button = variant === "inline"
    ? "min-h-tap px-3 text-sm ring-1 ring-line ring-inset disabled:text-ink-subtle"
    : "min-h-13 w-full px-4 text-left text-[15px] ring-1 ring-line ring-inset disabled:text-ink-subtle";
  const otherDays = Array.from({ length: dayTotal }, (_, i) => i + 1).filter((n) => n !== day);
  return (
    <>
      <button type="button" disabled className={button}>이야기 보기 · 준비 중</button>
      {index > 0 && <button type="button" onClick={() => onShift(index - 1)} className={button}>순서 앞으로</button>}
      {index < count - 1 && <button type="button" onClick={() => onShift(index + 1)} className={button}>순서 뒤로</button>}
      {otherDays.map((n) => (
        <button key={n} type="button" onClick={() => onMoveDay(n)} className={button}>{n}일차로 옮기기</button>
      ))}
      <button type="button" onClick={onRemove} className={button}>일정에서 빼기</button>
    </>
  );
}
