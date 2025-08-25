import { supabasePublic } from "@/lib/supabase-client";
import Image from "next/image";
import Link from "next/link";

export const revalidate = 0;

type LinkItem = { label: string; url: string; icon?: string };
type PostMeta = { products?: any[]; tags?: string[] };

export default async function InfluencerPage({ params }: { params: { slug: string } }) {
  // 인플루언서 정보
  const { data: influencer, error: infErr } = await supabasePublic
    .from("influencers")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (infErr || !influencer) {
    return <main className="p-6">존재하지 않는 인플루언서입니다.</main>;
  }

  // 해당 인플루언서의 공개 포스트
  const { data: posts } = await supabasePublic
    .from("posts")
    .select("id, title, cover_image_url, meta, created_at")
    .eq("published", true)
    .eq("influencer_id", influencer.id)
    .order("created_at", { ascending: false });

  const links: LinkItem[] = Array.isArray(influencer.links) ? influencer.links : [];

  return (
    <main className="space-y-6">
      {/* 헤더: 모바일/PC 동일, 가운데 정렬 (avatar 미표시) */}
      <section className="w-full flex justify-center pt-4 px-4">
        <div className="w-[640px] max-w-full text-center">
          <h1 className="text-xl font-semibold">{influencer.name ?? `@${influencer.slug}`}</h1>
          <p className="text-sm text-neutral-500">@{influencer.slug}</p>
        </div>
      </section>

      {/* 소개: 가운데 정렬, 모바일 우선, avatar 미표시 */}
      <section className="w-full flex justify-center px-4">
        <div className="w-[640px] max-w-full rounded-2xl border bg-white shadow-sm p-4 space-y-3 text-center">
          {influencer.bio && (
            <p className="text-neutral-700 whitespace-pre-wrap">{influencer.bio}</p>
          )}
          {links.length > 0 && (
            <div className="grid gap-2">
              {links.map((l, i) => (
                <a
                  key={i}
                  href={l.url}
                  target="_blank"
                  className="inline-flex items-center gap-2 justify-center rounded-2xl border px-3 py-2 bg-white shadow-sm text-sm"
                >
                  <span className="text-lg">{l.icon ?? ""}</span>
                  <span className="truncate">{l.label}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 피드: 항상 3열, 고정 썸네일 200×200, 가운데 정렬 (모바일/PC 동일) */}
      <section className="w-full flex justify-center px-4">
        {/* 200px × 3열 + 간격(2px × 2) = 총 약 604px → 컨테이너를 고정폭으로 중앙 배치 */}
        <div className="w-[606px] max-w-full grid grid-cols-3 gap-[2px] place-items-center">
          {(posts ?? []).map((p) => {
            const meta: PostMeta = p.meta ?? {};
            return (
              <Link
                key={p.id}
                href={`/post/${p.id}`}
                className="block bg-white overflow-hidden rounded-md"
              >
                {/* fill 제거, 고정 크기 지정으로 확대 방지 */}
                <Image
                  src={p.cover_image_url}
                  alt={p.title}
                  width={200}
                  height={200}
                  className="object-cover w-[200px] h-[200px] block"
                  sizes="200px"
                />
              </Link>
            );
          })}
          {(!posts || posts.length === 0) && (
            <div className="col-span-3 text-center text-neutral-500 py-10">
              아직 등록된 코디가 없습니다.
            </div>
          )}
        </div>
      </section>

      {/* 하단 링크 */}
      <section className="w-full flex justify-center px-4">
        <div className="w-[640px] max-w-full text-center">
          <Link className="text-sm underline" href="/">홈으로</Link>
        </div>
      </section>
    </main>
  );
}
