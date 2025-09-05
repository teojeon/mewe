// src/app/layout.tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

import HeaderGate from "@/components/HeaderGate";
import Header from "@/components/Header";
import SearchModalProvider from "@/components/SearchModalProvider"; // ⬅️ 추가

export const metadata: Metadata = {
  title: "CREATOR.SHOP",
  description: "Influencer catalog",
};

const pretendard = localFont({
  src: [
    {
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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={pretendard.variable}>
        <HeaderGate>
          <Header />
        </HeaderGate>

        {/* ⬇️ 모든 페이지에서 검색 모달이 동작하게 전역 장착 */}
        <SearchModalProvider />

        {children}
      </body>
    </html>
  );
}
