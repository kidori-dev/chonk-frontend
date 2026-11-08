import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

import MyBetsDock from "@/components/MyBetsDock";

// 본문 글꼴. 한글 글자는 subsets 에 없어도 필요한 부분만 나눠서 받아온다
const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chonk",
  description: "Chonk 포인트",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${notoSansKr.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* 모든 페이지에 떠 있는 내 배팅 패널 (자동배팅 끄기 + 최근 배팅) */}
        <MyBetsDock />
      </body>
    </html>
  );
}
