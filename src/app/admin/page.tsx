// src/app/admin/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabasePublic } from "@/lib/supabase-client";
import styles from "@/styles/admin.module.css";

type RowInfluencer = { name: string | null; slug: string | null } | null;

type RowPost = {
  id: string;
  title: string | null;
  created_at: string | null;
  published: boolean | null;
  influencer_id: string | null;
  influencers: RowInfluencer; // foreign select
};

export default function AdminHome() {
  const [posts, setPosts] = useState<RowPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
  const { data, error } = await supabasePublic
    .from("posts")
    .select(
      "id,title,created_at,published,influencer_id,influencers(name,slug)"
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  setPosts((data ?? []) as RowPost[]); // ✅ 안전하게 수정
} catch (err: any) {
  setMsg(`목록을 불러오지 못했습니다: ${err?.message ?? err}`);
} finally {
  setLoading(false);
}
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const onDelete = async (id: string) => {
    const ok = window.confirm("정말 이 게시글을 삭제할까요?");
    if (!ok) return;

    setMsg(null);
    try {
      const { error } = await supabasePublic.from("posts").delete().eq("id", id);
      if (error) throw error;
      // 낙관적 업데이트
      setPosts((prev) => prev.filter((p) => p.id !== id));
      setMsg("삭제했습니다.");
    } catch (err: any) {
      setMsg(`삭제에 실패했습니다: ${err?.message ?? err}`);
    }
  };

  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>Admin</h1>
        <div className={styles.actions}>
          {/* 상단 2개 버튼 분리 유지 */}
          <Link href="/admin/new-influencer" className={`${styles.btn} ${styles.btnPrimary}`}>
            신규 인플루언서
          </Link>
          <Link href="/admin/new" className={`${styles.btn} ${styles.btnSecondary}`}>
            새글
          </Link>
        </div>
      </header>

      {msg && <div className={styles.alert}>{msg}</div>}

      {/* 게시글 현황 리스트 (편집/삭제 등) */}
      <section aria-label="게시글 현황" style={{ marginTop: 8 }}>
        <div
          style={{
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 12,
            overflow: "hidden",
            background: "#fff",
          }}
        >
          {/* 헤더 행 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 160px 120px 160px 180px",
              gap: 0,
              padding: "10px 12px",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
              background: "#fafafa",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <div>제목</div>
            <div>인플루언서</div>
            <div>상태</div>
            <div>작성일</div>
            <div style={{ textAlign: "right" }}>작업</div>
          </div>

          {/* 로딩 / 비어있음 */}
          {loading ? (
            <div style={{ padding: "14px 12px", fontSize: 13, color: "#666" }}>
              불러오는 중...
            </div>
          ) : posts.length === 0 ? (
            <div style={{ padding: "14px 12px", fontSize: 13, color: "#666" }}>
              게시글이 없습니다.
            </div>
          ) : (
            posts.map((p) => {
              const influencerName = p.influencers?.name ?? "(이름 없음)";
              const influencerHandle = p.influencers?.slug
                ? `@${p.influencers.slug}`
                : "";
              const created =
                p.created_at
                  ? new Date(p.created_at).toLocaleString()
                  : "-";
              return (
                <div
                  key={p.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 160px 120px 160px 180px",
                    gap: 0,
                    alignItems: "center",
                    padding: "12px",
                    borderTop: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  {/* 제목 */}
                  <div style={{ minWidth: 0, fontSize: 14 }}>
                    <span
                      title={p.title ?? ""}
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {p.title ?? "(제목 없음)"}
                    </span>
                  </div>

                  {/* 인플루언서 */}
                  <div style={{ fontSize: 13, color: "#555" }}>
                    {influencerName}{" "}
                    <span style={{ color: "#888" }}>{influencerHandle}</span>
                  </div>

                  {/* 상태 */}
                  <div style={{ fontSize: 13 }}>
                    {p.published ? "공개" : "비공개"}
                  </div>

                  {/* 작성일 */}
                  <div style={{ fontSize: 13, color: "#666" }}>{created}</div>

                  {/* 작업 */}
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <Link
                      className={`${styles.btn} ${styles.btnGhost}`}
                      href={`/admin/edit/${p.id}`}
                      title="편집"
                    >
                      편집
                    </Link>
                    <button
                      className={`${styles.btn} ${styles.btnGhost}`}
                      onClick={() => onDelete(p.id)}
                      title="삭제"
                    >
                      삭제
                    </button>
                    <Link
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      href={`/post/${p.id}`}
                      title="보기"
                      target="_blank"
                    >
                      보기
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
