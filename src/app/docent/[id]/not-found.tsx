import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export default function DocentNotFound() {
  return (
    <div className="mx-auto w-full max-w-page px-gutter pb-16 lg:box-content lg:px-gutter-wide">
      <SiteHeader />
      <main className="pt-16">
        <h1 className="font-display text-2xl font-extrabold">이 장소의 이야기는 아직 없어요</h1>
        <p className="mt-3 text-sm text-ink-muted">사람이 확인한 해설만 보여드려요. 다른 이야기를 둘러보세요.</p>
        <Link href="/docent" className="mt-6 inline-flex min-h-13 items-center bg-room px-6 font-display font-bold text-on-room">모든 이야기 보기 →</Link>
      </main>
    </div>
  );
}
