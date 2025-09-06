// src/components/Header.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function Header() {
  const supabase = React.useMemo(() => createClientComponentClient(), []);
  const [mounted, setMounted] = React.useState(false);
  const [hasSession, setHasSession] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let alive = true;

    // ... (세션 확인 등 기존 로직 유지)

    return () => {
      alive = false;
    };
  }, [supabase]);

  return (
    <header className="app-header" role="banner" aria-label="상단 헤더">
      {/* 좌측: mewe 텍스트(링크처럼 보이지 않게 – 기존 스타일 유지) */}
      <Link href="/" aria-label="홈으로" className="brand">
        <strong style={{ fontWeight: 700, userSelect: "none", cursor: "default" }}>mewe</strong>
      </Link>

      {/* 우측: 검색 + (로그인/로그아웃) */}
      <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
        <button
          className="icon-btn"
          aria-label="검색"
          title="검색"
          onClick={() => (window as any).__openSearchModal?.()}
        >
          <svg className="icon-24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="7" strokeWidth="1.5" />
            <path d="M20 20l-3.2-3.2" strokeWidth="1.5" />
          </svg>
        </button>

        {/* 세션 의존 UI: 마운트 후에만 렌더하여 하이드레이션 오류 회피 */}
        {mounted ? (
          hasSession ? (
            <LogoutButton />
          ) : (
            <Link href="/login" className="tab-btn" aria-label="로그인">
              로그인
            </Link>
          )
        ) : null}
      </div>
    </header>
  );
}
