"use client";
import { useState, useEffect } from "react";
import { createPost, createInfluencer } from "./actions";
import { supabasePublic } from "@/lib/supabase-client";
import Image from "next/image";

type Influencer = { id: string; slug: string; name: string };

export default function AdminPage() {
  const [cover, setCover] = useState("");
  const [raw, setRaw] = useState(`[
  {"name": "화이트 티셔츠", "brand": "Uniqlo"}
]`);

  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [infId, setInfId] = useState<string>("");

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
      <section className="rounded-2xl border bg-white shadow-sm p-4 space-y-3">
        <h2 className="font-semibold">인플루언서 생성</h2>
        <form action={createInfluencer} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input name="slug" placeholder="slug (예: teo)" required className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-200" />
            <input name="name" placeholder="표시명 (예: Teo)" required className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-200" />
          </div>
          <input name="avatar_url" placeholder="아바타 이미지 URL" className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-200" />
          <textarea name="bio" placeholder="소개" className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-200 min-h-24" />
          <textarea
            name="links_json"
            placeholder='링크 JSON 배열(예: [{"label":"Instagram","url":"https://..."}])'
            className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-200 min-h-24 font-mono text-sm"
          />
          <button type="submit" className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium bg-white hover:bg-neutral-50 transition">
            생성
          </button>
        </form>
      </section>

      {/* 게시물 생성 */}
      <section className="rounded-2xl border bg-white shadow-sm p-4 space-y-4">
        <h2 className="font-semibold">게시물 생성</h2>
        <form action={createPost} className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">제목</label>
            <input name="title" placeholder="제목" required className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-200" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">커버 이미지 URL</label>
            <input
              name="cover_image_url"
              value={cover}
              onChange={(e) => setCover(e.target.value)}
              placeholder="https://..."
              required
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-200"
            />
            {cover && (
              <div className="relative">
                <Image
                  src={cover}
                  alt="preview"
                  width={400}
                  height={400}
                  sizes="(max-width: 640px) 90vw, 400px"
                  className="object-cover w-[400px] h-[400px] block rounded-lg border"
                />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">소속 인플루언서</label>
            <select
              name="influencer_id"
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-200"
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
            <textarea name="body" placeholder="본문" className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-200 min-h-24" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">제품 JSON 배열</label>
            <textarea
              name="products_json"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-200 min-h-40 font-mono text-sm"
            />
            <p className="text-xs text-neutral-500">
              예: [{"{"}"name":"화이트 티셔츠","brand":"Uniqlo"{"}"}]
            </p>
          </div>

          <button type="submit" className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium bg-white hover:bg-neutral-50 transition">
            등록
          </button>
        </form>
      </section>
    </main>
  );
}
