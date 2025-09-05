// src/app/login/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const supabase = useMemo(() => createClientComponentClient(), []);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  // 이미 로그인된 경우: 콜백 라우트로 보내서 후속 라우팅(/admin, /i/[slug], /onboarding) 재사용
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        window.location.href = `/auth/callback?next=${encodeURIComponent(next)}`;
      }
    });
  }, [supabase, next]);

  const signInWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
      // ✅ 요청하신 문구로 변경
      alert("Supabase를 통해 로그인 링크를 메일로 보내드렸어요!");
    } catch (err: any) {
      alert(err?.message || "이메일 전송에 실패했어요.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main style={{ maxWidth: 420, margin: "48px auto", padding: 16 }}>
      <h1 style={{ fontWeight: 700, fontSize: 24, marginBottom: 16 }}>
        인플루언서 로그인 / 회원가입
      </h1>
      <p style={{ color: "#666", marginBottom: 24 }}>
        이메일을 입력하시면, 받은 메일의 링크로 간편하게 로그인할 수 있어요.
      </p>

      {/* GitHub 로그인 UI는 요청대로 제거했습니다 */}

      <form onSubmit={signInWithEmail} style={{ display: "grid", gap: 8 }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          placeholder="you@example.com"
          required
          style={{
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: 8,
          }}
        />
        <button className="tab-btn" type="submit" disabled={sending}>
          {sending ? "전송 중…" : "이메일로 로그인 링크 받기"}
        </button>
      </form>

      <p style={{ fontSize: 12, color: "#888", marginTop: 16 }}>
        계속하면 약관 및 개인정보 처리방침에 동의하게 됩니다.
      </p>
    </main>
  );
}
