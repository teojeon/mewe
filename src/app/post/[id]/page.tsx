// src/app/post/[id]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { supabasePublic } from "@/lib/supabase-client";
import styles from "@/styles/post.module.css";
import feedStyles from "@/styles/feed.module.css"; // .linkBtn 재사용

type PostRow = {
  id: string;
  influencer_id: string;
  title: string | null;
  cover_image_url: string | null;
  body: string | null;
  meta: any | null; // { products?: {brand,name,link}[] }
};

type Influencer = {
  id: string;
  name: string | null;
  slug: string | null;
  // title 같은 필드는 사용하지 않음 (의도적으로 배제)
};

async function getPostById(id: string): Promise<PostRow | null> {
  const { data, error } = await supabasePublic
    .from("posts")
    .select("id,influencer_id,title,cover_image_url,body,meta")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }
  return (data as PostRow) ?? null;
}

async function getInfluencerById(id: string): Promise<Influencer | null> {
  const { data, error } = await supabasePublic
    .from("influencers")
    .select("id,name,slug") // ✅ title 등 기타 필드 불러오지 않음
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }
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

  return (
    <main className={styles.wrap}>
      {/* 상단: mewe/검색 대신 인플루언서 Name (폰트 크기 기존 유지) */}
      <header className={styles.topbar}>
        <div className={styles.topTitle}>{influencer?.name ?? ""}</div>
      </header>

      {/* 커버 이미지 */}
      {post.cover_image_url ? (
        <div className={styles.cover}>
          <Image
            src={post.cover_image_url}
            alt={post.title ?? ""}
            fill
            sizes="100vw"
            className={styles.coverImg}
          />
        </div>
      ) : null}

      {/* created_at 표시 제거(렌더 안 함) */}

      {/* 본문 텍스트 */}
      {post.body ? <div className={styles.body}>{post.body}</div> : null}

      {/* 착용 제품 리스트 - 모던 카드형 */}
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
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${feedStyles.linkBtn} ${styles.prodLink}`} // ✅ 크기 살짝 다운
                      >
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
