// src/components/LogoutButton.tsx
"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type Props = {
  className?: string;
  label?: string;
};

function extractSlug(pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  const m = /^\/i\/([^/]+)/.exec(pathname);
  return m?.[1] ?? null;
}

export default function LogoutButton({ className, label = "로그아웃" }: Props) {
  const supabase = React.useMemo(() => createClientComponentClient(), []);
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const onClick = async () => {
    if (loading) return;
    setLoading(true);

    try {
      // 1) 클라이언트 세션 정리
      await supabase.auth.signOut().catch(() => {});

      // 2) 서버 쿠키 정리(보강용)
      try {
        await fetch("/auth/signout", { method: "POST", cache: "no-store" });
      } catch {
        // 네트워크 실패 시 무시하고 다음 단계 진행
      }

      // 3) 이동할 경로 계산
      const slug = extractSlug(pathname);
      const to = slug ? `/i/${slug}` : "/";

      // 4) 안전 리다이렉트
      router.replace(to);
      // 일부 런타임에서 쿠키 반영 타이밍 보강
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "로그아웃 중 오류가 발생했어요.");
      router.replace("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className={className ? className : "tab-btn"}
      onClick={onClick}
      disabled={loading}
      title="로그아웃"
      aria-label="로그아웃"
    >
      {loading ? "로그아웃 중…" : label}
    </button>
  );
}
