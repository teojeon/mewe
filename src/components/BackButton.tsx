// src/components/BackButton.tsx
"use client";

import * as React from "react";

export default function BackButton({ fallback = "/" }: { fallback?: string }) {
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label="뒤로가기"
      title="뒤로가기"
      onClick={() => {
        try {
          if (typeof window !== "undefined") {
            if (window.history.length > 1) {
              window.history.back();
              return;
            }
            window.location.assign(fallback || "/");
          }
        } catch {
          if (typeof window !== "undefined") window.location.assign(fallback || "/");
        }
      }}
    >
      <svg className="icon-24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M10 6l-6 6 6 6" strokeWidth="1.5" />
        <path d="M4 12h16" strokeWidth="1.5" />
      </svg>
    </button>
  );
}
