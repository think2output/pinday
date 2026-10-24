import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PinDay",
  description: "부산을 이야기로 여행하는 AI 도슨트 플래너",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
