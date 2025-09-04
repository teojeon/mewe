// components/Header.tsx
"use client";

export default function Header() {
  return (
    <header className="app-header" role="banner" aria-label="상단 헤더">
      <strong style={{ fontWeight: 700 }}>mewe</strong>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="tab-btn"
          aria-label="검색"
          title="검색"
          onClick={() => (window as any).__openSearchModal?.()}
        >
          <svg className="icon-24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="7" strokeWidth="1.5"/>
            <path d="M20 20l-3.2-3.2" strokeWidth="1.5"/>
          </svg>
        </button>
      </div>
    </header>
  );
}
