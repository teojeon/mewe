// src/app/post/[id]/page.tsx
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

import styles from '@/styles/post.module.css';
import feedStyles from '@/styles/feed.module.css'; // .linkBtn 재사용 (제품 링크용)

export const dynamic = 'force-dynamic';

type ProductMeta = { brand?: string; name?: string; link?: string };
type InfluencerVM = { id: string; name: string | null; slug: string | null };

type PostVM = {
  id: string;
  title: string | null;
  cover_image_url: string | null;
  body: string | null;
  meta_products: ProductMeta[];
  influencer: InfluencerVM | null;
};

async function fetchPostVM(postId: string): Promise<PostVM | null> {
  const supabase = createServerComponentClient({ cookies });

  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      id,
      title,
      cover_image_url,
      body,
      meta,
      influencer_id,
      posts_influencers (
        influencers ( id, name, slug )
      ),
      posts_products (
        products ( brand, name, url )
      )
    `.trim(),
    )
    .eq('id', postId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // 인플루언서: 다대다 우선, 없으면 단일 FK 폴백
  let influencer: InfluencerVM | null = null;
  const relInf = Array.isArray((data as any).posts_influencers)
    ? (data as any).posts_influencers[0]?.influencers
    : null;

  if (relInf?.id) {
    influencer = {
      id: String(relInf.id),
      name: typeof relInf.name === 'string' || relInf.name === null ? relInf.name : String(relInf.name ?? ''),
      slug: typeof relInf.slug === 'string' || relInf.slug === null ? relInf.slug : String(relInf.slug ?? ''),
    };
  } else if ((data as any).influencer_id) {
    const { data: infRow, error: infErr } = await supabase
      .from('influencers')
      .select('id,name,slug')
      .eq('id', (data as any).influencer_id)
      .maybeSingle();
    if (infErr) throw infErr;
    if (infRow) {
      influencer = {
        id: String(infRow.id),
        name: typeof infRow.name === 'string' || infRow.name === null ? infRow.name : String(infRow.name ?? ''),
        slug: typeof infRow.slug === 'string' || infRow.slug === null ? infRow.slug : String(infRow.slug ?? ''),
      };
    }
  }

  // 제품: meta.products 우선, 없으면 관계 테이블에서
  let meta_products: ProductMeta[] = [];
  const meta = (data as any).meta;
  if (meta && Array.isArray(meta.products)) {
    meta_products = meta.products
      .map((p: any) => ({
        brand: typeof p?.brand === 'string' ? p.brand : undefined,
        name: typeof p?.name === 'string' ? p.name : undefined,
        link: typeof p?.link === 'string' ? p.link : undefined,
      }))
      .filter((p: ProductMeta) => p.brand || p.name || p.link);
  } else if (Array.isArray((data as any).posts_products)) {
    meta_products = (data as any).posts_products
      .map((pp: any) => pp?.products ?? null)
      .filter(Boolean)
      .map((prod: any) => ({
        brand: typeof prod?.brand === 'string' ? prod.brand : undefined,
        name: typeof prod?.name === 'string' ? prod.name : undefined,
        link: typeof prod?.url === 'string' ? prod.url : undefined,
      }))
      .filter((p: ProductMeta) => p.brand || p.name || p.link);
  }

  return {
    id: String((data as any).id),
    title: (data as any)?.title ?? null,
    cover_image_url: typeof (data as any)?.cover_image_url === 'string' ? (data as any).cover_image_url : null,
    body: typeof (data as any)?.body === 'string' ? (data as any).body : null,
    meta_products,
    influencer,
  };
}

export default async function Page({ params }: { params: { id: string } }) {
  let vm: PostVM | null = null;
  try {
    vm = await fetchPostVM(params.id);
  } catch (e: any) {
    return (
      <main className={styles.wrap}>
        <div className={styles.empty}>불러오기 실패: {String(e?.message ?? e)}</div>
      </main>
    );
  }
  if (!vm) {
    return (
      <main className={styles.wrap}>
        <div className={styles.empty}>게시글을 찾을 수 없습니다.</div>
      </main>
    );
  }

  const products = vm.meta_products;
  const slug = vm.influencer?.slug ?? '';

  return (
    <main className={styles.wrap}>
      {/* 상단 로컬 바: 왼쪽 @slug, 오른쪽 '프로필로' 버튼 */}
      <header className={styles.topbar}>
        <div className={styles.topbarRow}>
          <div className={styles.topTitle}>{slug ? `@${slug}` : ''}</div>
          {slug ? (
            <Link
              href={`/i/${slug}`}
              className={styles.backBtn}
              aria-label="인플루언서 프로필로 이동"
            >
              프로필로
              <span className={styles.backIcon}>→</span>
            </Link>
          ) : null}
        </div>
      </header>

      {/* 커버 이미지 (정사각형) */}
      {vm.cover_image_url ? (
        <div className={styles.cover}>
          <Image
            src={vm.cover_image_url}
            alt={vm.title ?? ''}
            fill
            sizes="100vw"
            className={styles.coverImg}
            priority
          />
        </div>
      ) : null}

      {/* 본문 텍스트 */}
      {vm.body ? <div className={styles.body}>{vm.body}</div> : null}

      {/* 착용 제품 리스트 - 모던 카드형 */}
      {products.length > 0 && (
        <section className={styles.products}>
          <h2 className={styles.sectionTitle}>착용 제품</h2>
          <ol className={styles.prodList}>
            {products.map((p, idx) => {
              const brand = p.brand?.trim() ?? '';
              const name = p.name?.trim() ?? '';
              const link = p.link?.trim() ?? '';
              const hasLink = !!link;

              return (
                <li key={idx} className={styles.prodItem}>
                  <div className={styles.num}>{idx + 1}</div>

                  <div className={styles.prodMeta}>
                    <div className={styles.prodLine}>
                      {brand && <span className={styles.brand}>{brand}</span>}
                      {brand && name && <span className={styles.dot}>|</span>}
                      {name && <span className={styles.prodName}>{name}</span>}
                    </div>

                    {hasLink && (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${feedStyles.linkBtn} ${styles.prodLink}`}
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
