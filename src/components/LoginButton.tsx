// components/LoginButton.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export function LoginButton() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setHasSession(!!s));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // 초기엔 서버/클라 동일 마크업 유지
  if (!mounted || hasSession === null) {
    return <span className="tab-btn" style={{ visibility: "hidden" }}>로그인</span>;
  }

  const goLogin = () => {
    const next = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
    router.push(`/login?next=${encodeURIComponent(next)}`);
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
      // 로그아웃 직후 현재 페이지 새로고침으로 UI 동기화
      if (typeof window !== "undefined") window.location.reload();
    }
  };

  return hasSession ? (
    <button className="tab-btn" onClick={signOut} disabled={loading} title="로그아웃">로그아웃</button>
  ) : (
    <button className="tab-btn" onClick={goLogin} disabled={loading} title="로그인">로그인</button>
  );
}
