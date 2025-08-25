// src/app/i/[slug]/page.tsx
import { supabasePublic } from "@/lib/supabase-client";
import Image from "next/image";
import Link from "next/link";

export const revalidate = 0;

type LinkItem = { label: string; url: string; icon?: string };
type PostMeta = { products?: any[]; tags?: string[] };

export default async function InfluencerPage({ params }: { params: { slug: string } }) {
  // 1) 인플루언서 정보
  const { data: influencer, error: infErr } = await supabasePublic
    .from("influencers")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (infErr || !influencer) {
    return <main className="p-6">존재하지 않는 인플루언서입니다.</main>;
  }

  // 2) 해당 인플루언서의 공개 포스트
  const { data: posts } = await supabasePublic
    .from("posts")
    .select("id, title, cover_image_url, meta, created_at")
    .eq("published", true)
    .eq("influencer_id", influencer.id)
    .order("created_at", { ascending: false });

  const links: LinkItem[] = Array.isArray(influencer.links) ? influencer.links : [];

  return (
    <main className="space-y-6">
      {/* 헤더(≈100px) */}
      <section className="profile-wrap pt-4">
        <div className="profile-title">{influencer.name ?? `@${influencer.slug}`}</div>
        <div className="profile-handle">@{influencer.slug}</div>
      </section>

      {/* 소개(≈300px, main.png의 pill 버튼 UI) */}
      <section className="profile-wrap">
        <div className="card p-4 sm:p-6 flex flex-col items-center gap-3">
          {/* 아바타는 선택(있으면 표시) */}
          {influencer.avatar_url && (
            <Image
              src={influencer.avatar_url}
              alt={influencer.name || influencer.slug}
              width={80}
              height={80}
              className="rounded-full object-cover border"
            />
          )}

          {influencer.bio && (
            <p className="text-center text-neutral-700 whitespace-pre-wrap">{influencer.bio}</p>
          )}

          {links.length > 0 && (
            <div className="w-full grid gap-2">
              {links.map((l, i) => (
                <a
                  key={i}
                  href={l.url}
                  target="_blank"
                  className="pill justify-center"
                >
                  <span className="text-lg">{l.icon ?? ""}</span>
                  <span className="truncate">{l.label}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 코디 그리드: 모바일 3열, 태블릿 4열, 데스크톱 6열 */}
      <section className="profile-wrap">
        <div className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-[6px] sm:gap-2">
          {(posts ?? []).map((p) => {
            const meta: PostMeta = p.meta ?? {};
            const tags = Array.isArray(meta.tags) ? meta.tags : [];
            const hot = tags.includes("HOT");
            const best = tags.includes("BEST");
            return (
              <Link
                key={p.id}
                href={`/post/${p.id}`}
                className="block overflow-hidden rounded-lg bg-white"
              >
                <div className="square">
                  {/* Next Image (고정 정사각 컨테이너 내부) */}
                  <Image src={p.cover_image_url} alt={p.title} fill className="object-cover" />
                  {hot && <span className="thumb-badge thumb-badge-hot">HOT</span>}
                  {best && <span className="thumb-badge thumb-badge-best">BEST</span>}
                </div>
              </Link>
            );
          })}
          {(!posts || posts.length === 0) && (
            <div className="col-span-full text-center text-neutral-500 py-10">
              아직 등록된 코디가 없습니다.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
