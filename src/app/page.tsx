// 임시 홈. 기본 구조와 디자인 값 연결 확인용이며, 홈 화면 작업(기획서 6-1) 때 교체한다.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div className="rounded-card bg-surface p-6">
        <h1 className="text-2xl font-bold">PinDay</h1>
        <p className="mt-2 text-ink-muted">부산을 이야기로 여행하는 AI 도슨트 플래너</p>
      </div>
      <button
        type="button"
        className="min-h-tap rounded-control bg-accent px-5 font-semibold text-accent-ink"
      >
        준비 중이에요
      </button>
    </main>
  );
}
