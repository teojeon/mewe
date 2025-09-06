// src/app/password/forgot/page.tsx  (신규)
"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function PasswordForgotPage() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const supabase = useMemo(() => createClientComponentClient(), []);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/password/reset?next=${encodeURIComponent(next)}`,
      });
      if (error) throw error;
      alert("비밀번호 재설정 링크를 메일로 보냈어요!");
    } catch (err: any) {
      alert(err?.message || "전송 실패");
    } finally {
      setSending(false);
    }
  };

  return (
    <main style={{ maxWidth: 420, margin: "48px auto", padding: 16 }}>
      <h1 style={{ fontWeight: 700, fontSize: 22, marginBottom: 12 }}>비밀번호 재설정</h1>
      <p style={{ color: "#666", marginBottom: 10 }}>가입하신 이메일을 입력해 주세요.</p>
      <form onSubmit={sendReset} style={{ display: "grid", gap: 8 }}>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          required
          style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8 }}
        />
        <button className="tab-btn" type="submit" disabled={sending}>
          {sending ? "전송 중…" : "재설정 링크 보내기"}
        </button>
      </form>
    </main>
  );
}
