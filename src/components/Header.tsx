// components/Header.tsx
"use client";

import Link from "next/link";
import { LoginButton } from "@/components/LoginButton";

export default function Header() {
  return (
    <header className="app-header" role="banner" aria-label="상단 헤더">
      {/* ⬇︎ brand 클래스로 스타일 제어 */}
      <Link href="/" aria-label="홈으로 이동" className="brand">
        <strong style={{ fontWeight: 700 }}>mewe</strong>
      </Link>

      <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
        <button
          className="tab-btn"
          aria-label="검색"
          title="검색"
          onClick={() => (window as any).__openSearchModal?.()}
        >
          <svg className="icon-24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="7" strokeWidth="1.5"/>
            <path d="M20 20l-3.2-3.2" strokeWidth="1.5"/>
          </svg>
        </button>
        <LoginButton />
      </div>
    </header>
  );
}
