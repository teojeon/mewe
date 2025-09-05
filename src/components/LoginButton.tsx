// components/LoginButton.tsx
"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export function LoginButton() {
  const supabase = createClientComponentClient();
  const [mounted, setMounted] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  // 마운트 이후에만 세션 판단 (SSR ↔ CSR 불일치 방지)
  useEffect(() => {
    setMounted(true);
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setHasSession(!!s));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // 초기에는 서버/클라 동일 마크업(숨김 placeholder)로 맞춘다
  if (!mounted || hasSession === null) {
    return (
      <span className="tab-btn" style={{ visibility: "hidden" }}>
        로그인
      </span>
    );
  }

  const signIn = async () => {
    setLoading(true);
    try {
      await supabase.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  return hasSession ? (
    <button className="tab-btn" onClick={signOut} disabled={loading} title="로그아웃">
      로그아웃
    </button>
  ) : (
    <button className="tab-btn" onClick={signIn} disabled={loading} title="로그인">
      로그인
    </button>
  );
}
