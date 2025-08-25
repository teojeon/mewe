// src/app/page.tsx
import { supabasePublic } from "@/lib/supabase-client";
import Link from "next/link";
import Image from "next/image";

export const revalidate = 0;

type PostMeta = { products?: any[]; tags?: string[] };

export default async function Home() {
  const { data: posts, error } = await supabasePublic
    .from("posts")
    .select("id, title, cover_image_url, meta, created_at")
    .eq("published", true)
    .order("created_at", { ascending: false });

  if (error) return <main className="p-6">에러: {error.message}</main>;

  if (!posts?.length) {
    return (
      <section className="min-h-[calc(100vh-8rem)] grid place-content-center">
        <div className="text-center space-y-4">
          <div className="mx-auto h-24 w-24 rounded-full bg-neutral-100 flex items-center justify-center">📷</div>
          <h1 className="text-xl font-semibold">아직 업로드된 코디가 없어요</h1>
          <p className="text-neutral-600">/admin에서 첫 게시물을 등록해보세요.</p>
          <a className="btn" href="/admin">Admin으로 가기</a>
        </div>
      </section>
    );
  }

  // 모바일 2열 → 태블릿 3열 → 데스크톱 5열
  return (
    <section className="max-w-screen-xl mx-auto">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-3">
        {posts.map((p) => {
          const meta: PostMeta = p.meta ?? {};
          return (
            <Link key={p.id} href={`/post/${p.id}`} className="block rounded-lg overflow-hidden bg-white">
              <div className="square">
                <Image src={p.cover_image_url} alt={p.title} fill className="object-cover" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
