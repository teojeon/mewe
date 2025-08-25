import { supabasePublic } from "@/lib/supabase-client";
import Image from "next/image";
import Link from "next/link";

type Product = {
  name: string;
  brand?: string;
  price?: number;
  currency?: string;
  external_url?: string;
  image_url?: string;
};

export const revalidate = 0;

export default async function PostPage({ params }: { params: { id: string } }) {
  const { data: post, error } = await supabasePublic
    .from("posts")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error) return <main className="p-6">에러: {error.message}</main>;
  if (!post) return <main className="p-6">존재하지 않는 게시물</main>;

  const products: Product[] = post.meta?.products ?? [];

  return (
    <article className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="btn">← 목록</Link>
        <span className="text-xs text-neutral-500">{new Date(post.created_at).toLocaleString()}</span>
      </div>

      <div className="card overflow-hidden">
        <div className="relative aspect-square">
          <Image src={post.cover_image_url} alt={post.title} fill className="object-cover" />
        </div>
        {post.body && <div className="p-4 text-neutral-700 whitespace-pre-wrap">{post.body}</div>}
      </div>

      {!!products.length && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">착용 제품</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {products.map((prd, i) => (
              <li key={i} className="card p-3">
                <div className="flex gap-3 items-center">
                  {prd.image_url && (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border">
                      <Image src={prd.image_url} alt={prd.name} fill className="object-cover" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-medium truncate">{prd.name}</div>
                    {prd.brand && <div className="text-sm text-neutral-500">{prd.brand}</div>}
                    {prd.price != null && (
                      <div className="text-sm">{Number(prd.price).toLocaleString()} {prd.currency ?? "KRW"}</div>
                    )}
                    {prd.external_url && (
                      <a className="text-sm underline" href={prd.external_url} target="_blank">제품 보러가기</a>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
