import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// 글꼴 파일과 라이선스(OFL)는 src/app/fonts/
const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  weight: "45 920",
  display: "swap",
  variable: "--font-pretendard",
});

const wantedSans = localFont({
  src: "./fonts/WantedSansVariable.woff2",
  weight: "100 950",
  display: "swap",
  variable: "--font-wanted-sans",
});

export const metadata: Metadata = {
  title: "PinDay",
  description: "부산을 이야기로 여행하는 AI 도슨트 플래너",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pretendard.variable} ${wantedSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
