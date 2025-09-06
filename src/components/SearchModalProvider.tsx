// components/SearchModalProvider.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import styles from "@/styles/feed.module.css";

type PostCard = { id: string; cover_image_url: string | null };
type InfRow = { id: string | null; name: string | null; slug: string | null };

export default function SearchModalProvider() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [posts, setPosts] = useState<PostCard[]>([]);
  const [infs, setInfs] = useState<InfRow[]>([]);
  const containerRef = useRef<HTMLElement | null>(null);

  // 모달 컨테이너 보장
  useEffect(() => {
    setMounted(true);
    let el = document.getElementById("search-root") as HTMLElement | null;
    if (!el) {
      el = document.createElement("div");
      el.id = "search-root";
      document.body.appendChild(el);
    }
    containerRef.current = el;
  }, []);

  // 데이터 로드 (한 번만)
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const { data: prows, error: pErr } = await supabase
          .from("posts")
          .select("id, cover_image_url, published")
          .order("created_at", { ascending: false });
        if (pErr) throw pErr;
        const normPosts: PostCard[] = (prows ?? []).map((r: any) => ({
          id: String(r.id),
          cover_image_url: typeof r?.cover_image_url === "string" ? r.cover_image_url : null,
        }));
        if (!alive) return;
        setPosts(normPosts);

        const { data: irows, error: iErr } = await supabase
          .from("influencers")
          .select("id, name, slug")
          .order("created_at", { ascending: false });
        if (iErr) throw iErr;
        if (!alive) return;
        setInfs((irows ?? []).map((r: any) => ({
          id: r?.id ?? null, name: r?.name ?? null, slug: r?.slug ?? null
        })));
      } catch {
        // UI 우선: 실패해도 모달 동작은 유지
      }
    };
    run();
    return () => { alive = false; };
  }, [supabase]);

  // 전역 훅 정의 (모든 페이지 공통)
  useEffect(() => {
    (window as any).__openSearchModal = () => setOpen(true);
    (window as any).__closeSearchModal = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!mounted || !containerRef.current) return null;

  const qLower = q.trim().toLowerCase();
  const filteredInfs = qLower.length === 0
    ? infs.slice(0, 8)
    : infs
        .filter(i => (i?.name ?? "").toLowerCase().includes(qLower) || (i?.slug ?? "").toLowerCase().includes(qLower))
        .slice(0, 20);

  const modal = open && (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "grid",
        placeItems: "center",
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 92vw)",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          padding: 16,
        }}
      >
        {/* 입력 영역 */}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="인플루언서/게시물 검색..."
            autoFocus
            style={{
              flex: 1, padding: 12, border: "1px solid #e2e5ea", borderRadius: 10, outline: "none"
            }}
          />
          <button className="tab-btn" onClick={() => setOpen(false)}>닫기</button>
        </div>

        {/* 결과 영역: 인플루언서 우선 */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: "#777", marginBottom: 8 }}>Influencers</div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
            {filteredInfs.length === 0 ? (
              <li style={{ color: "#666", fontSize: 13 }}>결과가 없습니다.</li>
            ) : (
              filteredInfs.map((inf) => (
                <li key={inf.id ?? `${inf.slug}`}>
                  <Link
                    href={`/i/${inf.slug ?? ""}`}
                    className={styles.linkBtn}
                    onClick={() => setOpen(false)}
                  >
                    @{inf.slug ?? "—"}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, containerRef.current);
}
