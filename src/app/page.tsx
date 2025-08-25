import { supabasePublic } from "@/lib/supabase-client";
import Link from "next/link";
import Image from "next/image";

export const revalidate = 0;

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
          <a className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium bg-white hover:bg-neutral-50 transition" href="/admin">
            Admin으로 가기
          </a>
        </div>
      </section>
    );
  }

  // 예: 홈은 5열(200px) 그리드
  return (
    <section className="w-full flex justify-center">
      <div className="w-[1010px] max-w-full grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 gap-[2px] place-items-center px-4">
        {posts.map((p) => (
          <Link key={p.id} href={`/post/${p.id}`} className="block bg-white overflow-hidden rounded-md">
            <Image
              src={p.cover_image_url}
              alt={p.title}
              width={200}
              height={200}
              className="object-cover w-[200px] h-[200px] block"
              sizes="200px"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
