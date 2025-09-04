// src/app/post/[id]/page.tsx
import Image from 'next/image';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { notFound, redirect } from 'next/navigation';

import styles from '@/styles/post.module.css';
import feedStyles from '@/styles/feed.module.css';

export const dynamic = 'force-dynamic';

type ProductMeta = { brand?: string; name?: string; link?: string };
type InfluencerVM = { id: string; name: string | null; slug: string | null };

type PostVM = {
  id: string;
  title: string | null;
  cover_image_url: string | null;
  body: string | null;
  influencer: InfluencerVM | null;
  meta_products: ProductMeta[];
  author_influencer_id: string | null;
};

async function fetchPostVM(postId: string): Promise<PostVM | null> {
  const supabase = createServerComponentClient({ cookies });

  // posts + 관계(인플루언서/제품)
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
      author_influencer_id,
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

  // 인플루언서: 다대다 우선 → 단일 FK 폴백 → 둘 다 없으면 null
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
    const { data: infRow } = await supabase
      .from('influencers')
      .select('id,name,slug')
      .eq('id', (data as any).influencer_id)
      .maybeSingle();
    if (infRow) {
      influencer = {
        id: String(infRow.id),
        name: typeof infRow.name === 'string' || infRow.name === null ? infRow.name : String(infRow.name ?? ''),
        slug: typeof infRow.slug === 'string' || infRow.slug === null ? infRow.slug : String(infRow.slug ?? ''),
      };
    }
  }

  // 제품: meta.products 우선 → 관계(posts_products) 폴백
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
    influencer,
    meta_products,
    author_influencer_id: (data as any)?.author_influencer_id ?? null,
  };
}

// 권한 체크: author_influencer_id 우선, 없으면 페이지 인플루언서 id로 체크
async function canManage(post: PostVM): Promise<boolean> {
  const supabase = createServerComponentClient({ cookies });
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) return false;

  const targetInfId =
    post.author_influencer_id ??
    (post.influencer?.id ? post.influencer.id : null);
  if (!targetInfId) return false;

  const { data: memRaw } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', uid)
    .eq('influencer_id', targetInfId)
    .maybeSingle();

  type Role = 'owner' | 'editor' | 'viewer';
  const role = (memRaw?.role ?? '') as string;
  return role === 'owner' || role === 'editor';
}

export default async function Page({ params }: { params: { id: string } }) {
  const vm = await fetchPostVM(params.id);
  if (!vm) notFound();

  const products = vm.meta_products;
  const can = await canManage(vm);

  return (
    <main className={styles.wrap}>
      {/* 상단 바: 좌측 @slug(텍스트처럼 보이되 클릭 가능), 우측 액션 */}
      <header className={styles.topbar}>
        {vm.influencer?.slug ? (
          <Link href={`/i/${vm.influencer.slug}`} className={styles.topTitle} prefetch>
            @{vm.influencer.slug}
          </Link>
        ) : (
          <div className={styles.topTitle}>@—</div>
        )}

        {can && (
          <div className={styles.topActions}>
            <Link href={`/post/${vm.id}/edit`} className={styles.actionBtn}>
              편집
            </Link>
           <form
  action={async () => {
    'use server';
    const { cookies } = await import('next/headers');
    const { createServerActionClient } = await import('@supabase/auth-helpers-nextjs');
    const { redirect } = await import('next/navigation');

    const supabase = createServerActionClient({ cookies });
    // posts 삭제 (RLS 통과: author_influencer_id 기반 정책)
    await supabase.from('posts').delete().eq('id', vm.id);

    redirect(vm.influencer?.slug ? `/i/${vm.influencer.slug}` : '/');
  }}
>
  <button type="submit" className={`${styles.actionBtn} ${styles.actionDanger}`}>
    삭제
  </button>
</form>
          </div>
        )}
      </header>

      {/* 커버 */}
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

      {/* 본문 */}
      {vm.body ? <div className={styles.body}>{vm.body}</div> : null}

      {/* 제품 */}
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
