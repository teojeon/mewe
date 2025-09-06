// src/app/signup/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function SignupPage() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const supabase = useMemo(() => createClientComponentClient(), []);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        window.location.href = `/auth/callback?next=${encodeURIComponent(next)}`;
      }
    });
  }, [supabase, next]);

  const sendLink = async (e: React.FormEvent) => {
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
      alert("Supabase를 통해 로그인 링크를 메일로 보내드렸어요!");
    } catch (err: any) {
      alert(err?.message || "전송 실패");
    } finally {
      setSending(false);
    }
  };

  return (
    <main style={{ maxWidth: 420, margin: "48px auto", padding: 16 }}>
      <h1 style={{ fontWeight: 700, fontSize: 24, marginBottom: 16 }}>회원가입</h1>
      <p style={{ color: "#666", marginBottom: 16 }}>
        이메일로 로그인 링크를 받아 최초 가입을 진행합니다.
      </p>
      <form onSubmit={sendLink} style={{ display: "grid", gap: 8 }}>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          required
          style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8 }}
        />
        <button className="tab-btn" type="submit" disabled={sending}>
          {sending ? "전송 중…" : "로그인 링크 받기"}
        </button>
      </form>
    </main>
  );
}
