// src/app/post/[id]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { supabasePublic } from "@/lib/supabase-client";
import styles from "@/styles/post.module.css";
import feedStyles from "@/styles/feed.module.css";

type PostRow = {
  id: string;
  influencer_id: string;
  title: string | null;
  cover_image_url: string | null; // 이제 storage path
  body: string | null;
  meta: any | null; // { products?: {brand,name,link}[] }
};
type Influencer = { id: string; name: string | null; slug: string | null };

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

async function signUrl(bucket: string, path: string, expiresSec = 3600) {
  const res = await fetch(
    `${BASE_URL}/api/sign?bucket=${bucket}&path=${encodeURIComponent(path)}&expires=${expiresSec}`,
    { cache: "no-store" }
  );
  const j = await res.json();
  if (!res.ok) throw new Error(j.error || "sign failed");
  return j.url as string;
}

async function getPostById(id: string): Promise<PostRow | null> {
  const { data, error } = await supabasePublic
    .from("posts")
    .select("id,influencer_id,title,cover_image_url,body,meta")
    .eq("id", id)
    .maybeSingle();
  if (error) { console.error(error); return null; }
  return (data as PostRow) ?? null;
}

async function getInfluencerById(id: string): Promise<Influencer | null> {
  const { data, error } = await supabasePublic
    .from("influencers")
    .select("id,name,slug")
    .eq("id", id)
    .maybeSingle();
  if (error) { console.error(error); return null; }
  return (data as Influencer) ?? null;
}

export default async function Page({ params }: { params: { id: string } }) {
  const post = await getPostById(params.id);
  if (!post) {
    return (
      <main className={styles.wrap}>
        <div className={styles.empty}>게시글을 찾을 수 없습니다.</div>
      </main>
    );
  }

  const influencer = await getInfluencerById(post.influencer_id);
  const products: Array<{ brand?: string; name?: string; link?: string }> =
    post.meta?.products ?? [];

  const coverSrc = post.cover_image_url
    ? await signUrl("covers", post.cover_image_url, 3600)
    : null;

  return (
    <main className={styles.wrap}>
      <header className={styles.topbar}>
        <div className={styles.topTitle}>{influencer?.name ?? ""}</div>
      </header>

      {coverSrc ? (
        <div className={styles.cover}>
          <Image src={coverSrc} alt={post.title ?? ""} fill sizes="100vw" className={styles.coverImg} />
        </div>
      ) : null}

      {post.title ? <h1 className={styles.title}>{post.title}</h1> : null}
      {post.body ? <div className={styles.body}>{post.body}</div> : null}

      {products.length > 0 && (
        <section className={styles.products}>
          <h2 className={styles.sectionTitle}>착용 제품</h2>
          <ol className={styles.prodList}>
            {products.map((p, idx) => {
              const brand = p.brand?.trim() ?? "";
              const name = p.name?.trim() ?? "";
              const link = p.link?.trim() ?? "";
              const hasLink = !!link;

              return (
                <li key={idx} className={styles.prodItem}>
                  <div className={styles.num}>{idx + 1}</div>
                  <div className={styles.prodMeta}>
                    <div className={styles.prodLine}>
                      {brand && <span className={styles.brand}>{brand}</span>}
                      {(brand && name) && <span className={styles.dot}>|</span>}
                      {name && <span className={styles.prodName}>{name}</span>}
                    </div>
                    {hasLink && (
                      <a href={link} target="_blank" rel="noopener noreferrer" className={`${feedStyles.linkBtn} ${styles.prodLink}`}>
                        제품 더 알아보기
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </main>
  );
}
