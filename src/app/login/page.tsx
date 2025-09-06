// src/app/login/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function LoginPage() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const router = useRouter();
  const sp = useSearchParams();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  // 이미 로그인된 사용자는: admin이면 /admin, 아니면 기존 콜백 흐름으로
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!mounted || !uid) return;

      // admin 여부 확인 (본인 행만 조회 가능 정책 가정)
      const { data: adminRow } = await supabase
        .from("app_admins")
        .select("user_id")
        .eq("user_id", uid)
        .maybeSingle();

      if (adminRow) {
        router.replace("/admin");
      } else {
        // 기존 라우팅 로직 재사용
        const next = sp.get("next") || "/";
        router.replace(`/auth/callback?next=${encodeURIComponent(next)}`);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const next = sp.get("next") || "/";

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pw,
      });
      if (error) throw error;

      const uid = data?.user?.id;
      if (!uid) {
        // 이례적: 세션/유저 없음 → 안전 폴백
        router.replace(`/auth/callback?next=${encodeURIComponent(next)}`);
        return;
      }

      // ✅ admin이면 바로 /admin 이동
      const { data: adminRow } = await supabase
        .from("app_admins")
        .select("user_id")
        .eq("user_id", uid)
        .maybeSingle();

      if (adminRow) {
        router.replace("/admin");
        return;
      }

      // 일반 사용자: 기존 콜백 라우트로 위임(슬러그/멤버십/온보딩 분기 재사용)
      router.replace(`/auth/callback?next=${encodeURIComponent(next)}`);
    } catch (e: any) {
      setMsg(e?.message ?? "로그인 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>로그인</h1>
      {msg && (
        <div
          role="status"
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            border: "1px solid rgba(0,0,0,0.08)",
            background: "#fff7f7",
            color: "#b00",
            borderRadius: 8,
          }}
        >
          {msg}
        </div>
      )}
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>이메일(아이디)</span>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              border: "1px solid rgba(0,0,0,0.12)",
              borderRadius: 8,
              padding: "10px 12px",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>비밀번호</span>
          <input
            type="password"
            placeholder="••••••••"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
            style={{
              border: "1px solid rgba(0,0,0,0.12)",
              borderRadius: 8,
              padding: "10px 12px",
            }}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{
            height: 42,
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.12)",
            background: loading ? "#ddd" : "#111",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          {loading ? "로그인 중…" : "로그인"}
        </button>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <a
            href={`/signup?next=${encodeURIComponent((typeof window !== "undefined" ? window.location.pathname + window.location.search : sp.get("next")) || "/")}`}
            style={{ color: "#555", textDecoration: "underline", fontSize: 14 }}
          >
            회원가입
          </a>
        </div>
      </form>
    </main>
  );
}
