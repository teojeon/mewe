// src/app/password/reset/page.tsx  (신규)
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function PasswordResetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const supabase = useMemo(() => createClientComponentClient(), []);

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // 1) code 파라미터가 들어오는 케이스(Magic link와 유사) 처리
    const code = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("code") : null;
    (async () => {
      try {
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }
      } catch {
        // 무시 (아래 상태 체크로 커버)
      } finally {
        // 2) 세션 존재 여부 확인
        const { data } = await supabase.auth.getSession();
        setReady(!!data.session);
      }
    })();

    // 3) PASSWORD_RECOVERY 이벤트로 들어오는 케이스도 커버
    const { data: sub } = supabase.auth.onAuthStateChange((_event, _session) => {
      // 이벤트만으로도 세션이 준비될 수 있음
      supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const doReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return alert("링크가 만료되었거나 유효하지 않습니다. 다시 시도해 주세요.");
    if (!password.trim() || password.length < 8) return alert("비밀번호는 8자 이상 입력해 주세요.");
    if (password !== password2) return alert("비밀번호가 일치하지 않습니다.");

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      alert("비밀번호가 설정되었습니다. 로그인 화면으로 이동합니다.");
      router.push(`/login?next=${encodeURIComponent(next)}`);
    } catch (err: any) {
      alert(err?.message || "설정 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={{ maxWidth: 420, margin: "48px auto", padding: 16 }}>
      <h1 style={{ fontWeight: 700, fontSize: 22, marginBottom: 12 }}>비밀번호 설정</h1>
      {!ready ? (
        <p style={{ color: "#666" }}>링크 확인 중… 잠시만요 ⏳</p>
      ) : (
        <form onSubmit={doReset} style={{ display: "grid", gap: 8 }}>
          <input
            type="password"
            placeholder="새 비밀번호 (8자 이상)"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            required
            minLength={8}
            style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8 }}
          />
          <input
            type="password"
            placeholder="새 비밀번호 확인"
            value={password2}
            onChange={(e) => setPassword2(e.currentTarget.value)}
            required
            minLength={8}
            style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8 }}
          />
          <button className="tab-btn" type="submit" disabled={saving}>
            {saving ? "저장 중…" : "비밀번호 저장"}
          </button>
        </form>
      )}
    </main>
  );
}
