// components/SearchModalProvider.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function SearchModalProvider() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const containerRef = useRef<HTMLElement | null>(null);

  // 모달 컨테이너를 보장
  useEffect(() => {
    setMounted(true);
    let el = document.getElementById("search-root") as HTMLElement | null;
    if (!el) {
      el = document.createElement("div");
      el.id = "search-root";
      document.body.appendChild(el);
    }
    containerRef.current = el;

    // 전역 트리거 제공
    (window as any).__openSearchModal = () => {
      setOpen(true);
      // 첫 오픈 시 입력창 포커스는 다음 프레임에
      requestAnimationFrame(() => {
        const inp = document.getElementById("search-input") as HTMLInputElement | null;
        inp?.focus();
      });
    };

    return () => {
      if ((window as any).__openSearchModal) {
        delete (window as any).__openSearchModal;
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!mounted || !containerRef.current) return null;

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: open ? "grid" : "none",
        placeItems: "start center",
        paddingTop: "10vh",
        zIndex: 1000,
      }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 92vw)",
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          padding: 16,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <input
            id="search-input"
            value={q}
            onChange={(e) => setQ(e.currentTarget.value)}
            placeholder="검색어를 입력하세요…"
            style={{
              flex: 1,
              padding: "10px 12px",
              border: "1px solid #e3e3e3",
              borderRadius: 8,
            }}
          />
          <button className="tab-btn" onClick={() => setOpen(false)}>닫기</button>
        </div>

        {/* 결과 영역(필요 시 실제 검색 로직 연동) */}
        <div style={{ marginTop: 12, color: "#666", fontSize: 14 }}>
          <em>검색 프로토타입</em> — UI만 먼저 붙였습니다. 추후 엔드포인트와 연결 가능.
        </div>
      </div>
    </div>
  );

  return createPortal(modal, containerRef.current);
}
