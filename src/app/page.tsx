// 임시 홈. 기본 구조와 디자인 값 연결 확인용이며, 홈 화면 작업(기획서 6-1) 때 교체한다.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <div className="bg-room px-gutter py-16 text-on-room">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">PinDay</h1>
        <p className="mt-3 text-on-room-muted">부산을 이야기로 여행하는 AI 도슨트 플래너</p>
        <button
          type="button"
          className="mt-8 min-h-tap w-full max-w-md rounded-control bg-bg px-5 font-display font-bold text-ink shadow-glow-soft"
        >
          준비 중이에요
        </button>
      </div>
    </main>
  );
}
