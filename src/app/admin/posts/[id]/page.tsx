// src/app/admin/posts/[id]/page.tsx
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import styles from "@/styles/admin.module.css";

type ProductMeta = { brand?: string | null; name?: string | null; link?: string | null };

function normalizeProducts(meta: any, relationRows: any[] | null | undefined): ProductMeta[] {
  const fromMeta: ProductMeta[] = Array.isArray(meta?.products)
    ? meta.products
        .map((p: any) => ({
          brand: typeof p?.brand === "string" ? p.brand : null,
          name: typeof p?.name === "string" ? p.name : null,
          link: typeof p?.link === "string" ? p.link : null,
        }))
        .filter((p: ProductMeta) => p.brand || p.name || p.link)
    : [];

  const fromRelation: ProductMeta[] = Array.isArray(relationRows)
    ? relationRows
        .map((row: any) => row?.products ?? null)
        .filter(Boolean)
        .map((prod: any) => ({
          brand: typeof prod?.brand === "string" ? prod.brand : null,
          name: typeof prod?.name === "string" ? prod.name : null,
          link: typeof prod?.url === "string" ? prod.url : null,
        }))
        .filter((p: ProductMeta) => p.brand || p.name || p.link)
    : [];

  const combined: ProductMeta[] = [];
  const seen = new Set<string>();

  for (const item of [...fromMeta, ...fromRelation]) {
    const key = `${item.brand ?? ""}|${item.name ?? ""}|${item.link ?? ""}`;
    if (!seen.has(key)) {
      combined.push(item);
      seen.add(key);
    }
  }

  return combined;
}

export default async function AdminPostPage({ params }: { params: { id: string } }) {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { user } = { user: null },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin");
  }

  const { data: adminRow } = await supabase
    .from("app_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) {
    notFound();
  }

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
    }
  );

  const { data: post, error } = await service
    .from("posts")
    .select(
      `
      id,
      title,
      body,
      cover_image_url,
      meta,
      author_influencer_id,
      posts_influencers (
        influencers ( id, name, slug )
      ),
      posts_products (
        products ( id, brand, name, url )
      )
    `.trim()
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!post) {
    notFound();
  }

  const title =
    typeof post.title === "string" && post.title.trim().length > 0 ? post.title.trim() : "제목 없음";
  const cover =
    typeof post.cover_image_url === "string" && post.cover_image_url.trim().length > 0
      ? post.cover_image_url
      : null;
  const body =
    typeof post.body === "string" && post.body.trim().length > 0 ? post.body.trim() : null;

  const relInfluencer = Array.isArray(post.posts_influencers)
    ? post.posts_influencers[0]?.influencers ?? null
    : null;
  let influencerName: string | null =
    typeof relInfluencer?.name === "string" ? relInfluencer.name : null;
  let influencerSlug: string | null =
    typeof relInfluencer?.slug === "string" ? relInfluencer.slug : null;

  if (!influencerSlug && post.author_influencer_id) {
    const { data: infRow } = await service
      .from("influencers")
      .select("name, slug")
      .eq("id", post.author_influencer_id)
      .maybeSingle();
    if (infRow) {
      influencerName =
        typeof infRow.name === "string" && infRow.name.trim().length > 0 ? infRow.name : influencerName;
      influencerSlug =
        typeof infRow.slug === "string" && infRow.slug.trim().length > 0 ? infRow.slug : influencerSlug;
    }
  }

  const products = normalizeProducts(post.meta, post.posts_products);

  return (
    <main className={styles.wrap}>
      <section className={styles.section}>
        <Link href="/admin" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}>
          ← 관리자 목록으로
        </Link>
      </section>

      <section className={`${styles.section} ${styles.postView}`}>
        <header className={styles.postHeader}>
          <div>
            <h1 className={styles.postHeading}>{title}</h1>
            {influencerSlug ? (
              <div className={styles.postMeta}>
                작성자:&nbsp;
                <Link href={`/i/${influencerSlug}`} className={styles.postMetaLink}>
                  @{influencerSlug}
                </Link>
                {influencerName && <span className={styles.postMetaNote}> ({influencerName})</span>}
              </div>
            ) : (
              <div className={styles.postMeta}>작성자 정보를 찾을 수 없습니다.</div>
            )}
          </div>
          <div className={styles.postMetaSecondary}>포스트 ID: {post.id}</div>
        </header>

        {cover ? (
          <div className={styles.postCover}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" />
          </div>
        ) : null}

        {body ? <article className={styles.postBody}>{body}</article> : null}

        {products.length > 0 ? (
          <section className={styles.postProducts}>
            <h2 className={styles.postProductsTitle}>제품 목록</h2>
            <ul className={styles.postProductList}>
              {products.map((p, idx) => {
                const brand = p.brand?.trim() ?? "";
                const name = p.name?.trim() ?? "";
                const link = p.link?.trim() ?? "";
                return (
                  <li key={idx} className={styles.postProductRow}>
                    <div className={styles.postProductLine}>
                      {brand ? <span className={styles.postProductBrand}>{brand}</span> : null}
                      {brand && name ? <span className={styles.postProductSeparator}>·</span> : null}
                      {name ? <span>{name}</span> : null}
                    </div>
                    {link ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                      >
                        링크 열기
                      </a>
                    ) : (
                      <span className={styles.clickCardEmpty}>링크 없음</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : (
          <div className={styles.clickCardEmpty}>연결된 제품이 없습니다.</div>
        )}
      </section>
    </main>
  );
}
