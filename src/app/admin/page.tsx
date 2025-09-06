// src/app/admin/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "@/styles/admin.module.css";

type InfluencerRow = {
  id: string;
  name: string | null;
  slug: string | null;
  avatar_url: string | null;
  instagram_verified_at: string | null;
};

export default function AdminPage() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const router = useRouter();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<InfluencerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>("");

  const load = async () => {
    setLoading(true);
    setMsg("");
    try {
      // influencers는 SELECT public 정책이 있다고 가정
      let query = supabase
        .from("influencers")
        .select("id,name,slug,avatar_url,instagram_verified_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (q.trim()) {
        // 간단 검색: name/slug LIKE
        query = query.ilike("name", `%${q.trim()}%`).ilike("slug", `%${q.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      setRows(
        (data ?? []).map((r: any) => ({
          id: String(r.id),
          name: r?.name ?? null,
          slug: r?.slug ?? null,
          avatar_url: typeof r?.avatar_url === "string" ? r.avatar_url : null,
          instagram_verified_at: r?.instagram_verified_at ?? null,
        }))
      );
    } catch (e: any) {
      setMsg(`불러오기 실패: ${e?.message ?? e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleVerify = async (id: string, nextVerified: boolean) => {
    setMsg("");
    try {
      const res = await fetch("/admin/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ influencer_id: id, verified: nextVerified }),
      });
      if (!res.ok) throw new Error(`API failed: ${res.status}`);
      await load();
      setMsg("저장되었습니다.");
    } catch (e: any) {
      setMsg(`저장 실패: ${e?.message ?? e}`);
    }
  };

  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>Admin: 인플루언서 관리</h1>
        <div className={styles.actions} style={{ display: "flex", gap: 8 }}>
          <input
            className={styles.input}
            placeholder="이름/슬러그 검색"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            style={{ minWidth: 220 }}
          />
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={load}>
            검색
          </button>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => router.refresh()}>
            새로고침
          </button>
        </div>
      </header>

      {msg && <div className={styles.alert}>{msg}</div>}

      {loading ? (
        <div className={styles.hint}>불러오는 중… ⏳</div>
      ) : rows.length === 0 ? (
        <div className={styles.hint}>등록된 인플루언서가 없습니다.</div>
      ) : (
        <section style={{ display: "grid", gap: 12 }}>
          {rows.map((r) => {
            const verified = !!r.instagram_verified_at;
            return (
              <div
                key={r.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  alignItems: "center",
                  gap: 12,
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 12,
                  padding: 12,
                  background: "#fff",
                }}
              >
                {/* 아바타 */}
                <div style={{ width: 48, height: 48, borderRadius: 10, overflow: "hidden", background: "#eee" }}>
                  {r.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : null}
                </div>

                {/* 정보 */}
                <div style={{ display: "grid" }}>
                  <div style={{ fontWeight: 600 }}>{r.name ?? "—"}</div>
                  <div style={{ color: "#666" }}>
                    @{r.slug ?? "—"} &nbsp;·&nbsp; 상태:&nbsp;
                    {verified ? <b style={{ color: "green" }}>인증</b> : <b style={{ color: "#b00" }}>미인증</b>}
                  </div>
                </div>

                {/* 액션 */}
                <div style={{ display: "flex", gap: 8 }}>
                  <Link href={r.slug ? `/i/${r.slug}/manage` : "#"} className={`${styles.btn} ${styles.btnGhost}`}>
                    관리 페이지
                  </Link>
                  <Link href={r.slug ? `/i/${r.slug}/dashboard` : "#"} className={`${styles.btn} ${styles.btnSecondary}`}>
    대시보드
  </Link>
                  <button
                    className={`${styles.btn} ${verified ? styles.btnGhost : styles.btnSecondary}`}
                    onClick={() => toggleVerify(r.id, !verified)}
                    title="관리자 전용 수동 인증 토글"
                  >
                    {verified ? "인증 해제" : "인증"}
                  </button>
                   {/* ✅ 추가된 대시보드 버튼 */}

  <button
    className={`${styles.btn} ${verified ? styles.btnGhost : styles.btnSecondary}`}
    onClick={() => toggleVerify(r.id, !verified)}
  >
    {verified ? "인증 해제" : "인증 처리"}
  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}
