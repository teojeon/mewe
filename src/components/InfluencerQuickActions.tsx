// components/InfluencerQuickActions.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/types/database.types";
import styles from "@/styles/feed.module.css"; // ← CSS Module 불러와서 .linkBtn 사용

type Role = "owner" | "editor" | "viewer" | "none";

function isRole(v: unknown): v is Exclude<Role, "none"> {
  return v === "owner" || v === "editor" || v === "viewer";
}

export default function InfluencerQuickActions({
  influencerId,
  slug,
  containerClassName,
}: {
  influencerId: string;
  slug: string;
  containerClassName?: string;
}) {
  const supabase = createClientComponentClient<Database>();
  const [mounted, setMounted] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [role, setRole] = useState<Role>("none");

  // 1) 마운트 이후에만 세션 확인
  useEffect(() => {
    setMounted(true);
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setHasSession(!!s));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // 2) 세션이 있을 때만 본인 membership 조회 (RLS 적용)
  useEffect(() => {
    if (!mounted || !hasSession || !influencerId) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("role")
        .eq("influencer_id", influencerId)
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setRole("none");
        return;
      }

      const raw = (data as { role?: unknown })?.role ?? null;
      setRole(isRole(raw) ? raw : "none");
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, hasSession, influencerId, supabase]);

  // 3) 초기 하이드레이션 동안은 비어있는 컨테이너(서버/클라 동일)
  if (!mounted) {
    return <div className={containerClassName} style={{ minWidth: 1, minHeight: 1 }} />;
  }

  if (!hasSession) {
    return <div className={containerClassName} />;
  }

  if (role === "owner" || role === "editor") {
    return (
      <div className={containerClassName}>
        <Link href={`/post/new?author=${influencerId}`} className={styles.linkBtn}>
          새 글
        </Link>
        <Link href={`/i/${slug}/manage`} className={styles.linkBtn}>
          관리
        </Link>
      </div>
    );
  }

  return <div className={containerClassName} />;
}
