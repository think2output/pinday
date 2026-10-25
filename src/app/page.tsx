import { Suspense } from "react";
import { homeData } from "@/lib/server/home";
import { HomeView } from "./_home/HomeView";
import { listDocents } from "@/lib/server/docent";

// 홈 (기획서 6-1). 장소 수·이야기는 서버에서 미리 읽고, 지역·기간은 브라우저의 내 여행 정보에서 읽는다.
// 내 여행 정보는 오늘 날짜(new Date)를 쓰므로 미리 만든 화면에 넣지 않고 Suspense로 방문할 때 그린다.
export default function Home() {
  const pinPlaces = listDocents().map((place) => ({ id: place.placeId, name: place.placeName, region: place.region, category: place.category, summary: place.draft.summary[0]?.text ?? "", image: place.image }));
  return (
    <Suspense fallback={<div className="min-h-180 bg-room" />}>
      <HomeView {...homeData()} pinPlaces={pinPlaces} />
    </Suspense>
  );
}
