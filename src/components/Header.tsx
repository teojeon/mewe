// src/components/Header.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import logo from "../../public/logo.png";
import LogoutButton from "@/components/LogoutButton";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function Header() {
  const supabase = React.useMemo(() => createClientComponentClient(), []);
  const [mounted, setMounted] = React.useState(false);
  const [hasSession, setHasSession] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    setMounted(true);

    let alive = true;
    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!alive) return;
        setHasSession(!!data.session);
      } catch {
        if (!alive) return;
        setHasSession(false);
      }
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
    });

    return () => {
      alive = false;
      sub.subscription?.unsubscribe?.();
    };
  }, [supabase]);

  return (
    <header className="app-header" role="banner" aria-label="상단 헤더">
      {/* 좌측: mewe 텍스트(링크처럼 보이지 않게 – 기존 스타일 유지) */}
      <Link href="/" aria-label="홈으로" className="brand">
          <Image src={logo} alt="mewe" className="brand-logo" priority />
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
