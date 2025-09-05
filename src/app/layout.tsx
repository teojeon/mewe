// src/app/layout.tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

import HeaderGate from "@/components/HeaderGate";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "CREATOR.SHOP",
  description: "Influencer catalog",
};

const pretendard = localFont({
  src: [
    {
      // ⬇️ 파일 시스템 상대 경로 (layout.tsx 기준)
      path: "../../public/fonts/pretendard/PretendardVariable.woff2",
      weight: "45 920",
      style: "normal",
    },
  ],
  variable: "--font-pretendard",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* 모바일 디스플레이 폭에 딱 맞추는 핵심 설정 */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={pretendard.variable}>
        <HeaderGate>
          <Header />
        </HeaderGate>
        {children}
      </body>
    </html>
  );
}
