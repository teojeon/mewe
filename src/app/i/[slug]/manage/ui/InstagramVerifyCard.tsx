// src/app/i/[slug]/manage/ui/InstagramVerifyCard.tsx
"use client";

import Link from "next/link";

export default function InstagramVerifyCard({
  slug,
}: {
  slug: string;
}) {
  return (
    <section style={{ border: "1px solid #eee", borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>인스타그램 계정 인증</h3>
      <p style={{ color: "#666", marginTop: 6, marginBottom: 12, fontSize: 13 }}>
        인스타그램 Basic Display OAuth로 소유자를 확인합니다. 현재 슬러그(@{slug})와 IG 유저명이 일치해야 인증됩니다.
      </p>
      <Link href={`/auth/instagram/start?slug=${encodeURIComponent(slug)}`} className="tab-btn">
        인스타그램 인증 시작
      </Link>
    </section>
  );
}
