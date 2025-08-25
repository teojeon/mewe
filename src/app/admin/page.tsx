// src/app/admin/page.tsx
"use client";
import { useState, useEffect } from "react";
import { createPost, createInfluencer } from "./actions";
import { supabasePublic } from "@/lib/supabase-client";

type Influencer = { id: string; slug: string; name: string };

export default function AdminPage() {
  const [cover, setCover] = useState("");
  const [raw, setRaw] = useState(`[
  {"name": "화이트 티셔츠", "brand": "Uniqlo"}
]`);

  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [infId, setInfId] = useState<string>("");

  // 인플루언서 목록 로드
  useEffect(() => {
    supabasePublic
      .from("influencers")
      .select("id, slug, name")
      .order("created_at", { ascending: false })
      .then(({ data }) => setInfluencers(data ?? []));
  }, []);

  return (
    <main className="mx-auto max-w-2xl space-y-10">
      <h1 className="text-2xl font-bold">Admin</h1>

      {/* 인플루언서 생성 */}
      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">인플루언서 생성</h2>
        <form action={createInfluencer} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input name="slug" placeholder="slug (예: teo)" required className="input" />
            <input name="name" placeholder="표시명 (예: Teo)" required className="input" />
          </div>
          <input name="avatar_url" placeholder="아바타 이미지 URL" className="input" />
          <textarea name="bio" placeholder="소개" className="input min-h-24" />
          <textarea
            name="links_json"
            placeholder='링크 JSON 배열(예: [{"label":"Instagram","url":"https://..."}])'
            className="input textarea-code min-h-24"
          />
          <button type="submit" className="btn">생성</button>
        </form>
      </section>

      {/* 게시물 생성 */}
      <section className="card p-4 space-y-4">
        <h2 className="font-semibold">게시물 생성</h2>
        <form action={createPost} className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">제목</label>
            <input name="title" placeholder="제목" required className="input" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">커버 이미지 URL</label>
            <input
              name="cover_image_url"
              value={cover}
              onChange={(e) => setCover(e.target.value)}
              placeholder="https://..."
              required
              className="input"
            />
            {cover && (
              <div className="relative aspect-square rounded-lg overflow-hidden border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover} alt="preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">소속 인플루언서</label>
            <select
              name="influencer_id"
              className="input"
              value={infId}
              onChange={(e) => setInfId(e.target.value)}
            >
              <option value="">(선택 안 함)</option>
              {influencers.map((inf) => (
                <option key={inf.id} value={inf.id}>
                  {inf.name} (@{inf.slug})
                </option>
              ))}
            </select>
            <p className="text-xs text-neutral-500">선택 시 /i/{`{slug}`} 페이지에 이 코디가 표시됩니다.</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">본문(선택)</label>
            <textarea name="body" placeholder="본문" className="input min-h-24" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">제품 JSON 배열</label>
            <textarea
              name="products_json"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              className="input textarea-code min-h-40"
            />
            <p className="text-xs text-neutral-500">
              예: [{"{"}"name":"화이트 티셔츠","brand":"Uniqlo"{"}"}]
            </p>
          </div>

          <button type="submit" className="btn">등록</button>
        </form>
      </section>
    </main>
  );
}
