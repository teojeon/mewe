// src/app/post/[id]/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import styles from '@/styles/post.module.css';

export const dynamic = 'force-dynamic';

/** 뷰모델: UI에서 쓰는 구조만 */
type InfVM = {
  name: string | null;
  slug: string | null;
  avatar_url: string | null;
};
type ProdVM = {
  brand: string | null;
  name: string | null;
  url: string | null;
  slug: string | null;
};
type PostVM = {
  id: string;
  title: string | null;
  created_at: string | null;
  published: boolean | null;
  cover_image_url: string | null;
  influencers: InfVM[];
  products: ProdVM[];
};

/** 안전 쿼리 + 정규화 (없음은 에러 아님) */
async function fetchPostVM(id: string): Promise<PostVM | null> {
  const supabase = createServerComponentClient({ cookies });

  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      title,
      created_at,
      published,
      cover_image_url,
      posts_influencers (
        influencers ( name, slug, avatar_url )
      ),
      posts_products (
        products ( brand, name, url, slug )
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const vm: PostVM = {
    id: String((data as any).id),
    title: (data as any)?.title ?? null,
    created_at:
      typeof (data as any)?.created_at === 'string'
        ? (data as any).created_at
        : (data as any)?.created_at
        ? String((data as any).created_at)
        : null,
    published:
      typeof (data as any)?.published === 'boolean'
        ? (data as any).published
        : (data as any)?.published == null
        ? null
        : Boolean((data as any).published),
    cover_image_url:
      typeof (data as any)?.cover_image_url === 'string'
        ? (data as any).cover_image_url
        : null,
    influencers: Array.isArray((data as any)?.posts_influencers)
      ? (data as any).posts_influencers
          .map((pi: any) => pi?.influencers ?? null)
          .filter(Boolean)
          .map((inf: any) => ({
            name:
              typeof inf?.name === 'string' || inf?.name === null
                ? inf?.name
                : String(inf?.name ?? ''),
            slug:
              typeof inf?.slug === 'string' || inf?.slug === null
                ? inf?.slug
                : String(inf?.slug ?? ''),
            avatar_url:
              typeof inf?.avatar_url === 'string' || inf?.avatar_url === null
                ? inf?.avatar_url
                : null,
          }))
      : [],
    products: Array.isArray((data as any)?.posts_products)
      ? (data as any).posts_products
          .map((pp: any) => pp?.products ?? null)
          .filter(Boolean)
          .map((pd: any) => ({
            brand:
              typeof pd?.brand === 'string' || pd?.brand === null
                ? pd?.brand
                : String(pd?.brand ?? ''),
            name:
              typeof pd?.name === 'string' || pd?.name === null
                ? pd?.name
                : String(pd?.name ?? ''),
            url:
              typeof pd?.url === 'string' || pd?.url === null
                ? pd?.url
                : '',
            slug:
              typeof pd?.slug === 'string' || pd?.slug === null
                ? pd?.slug
                : String(pd?.slug ?? ''),
          }))
      : [],
  };

  return vm;
}

export default async function PostPage({
  params,
}: {
  params: { id: string };
}) {
  let vm: PostVM | null = null;
  try {
    vm = await fetchPostVM(params.id);
  } catch (e: any) {
    // DB 에러는 사용자에게 친절히 노출
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.title}>Post</h1>
          <p className={styles.err}>불러오기 실패: {String(e?.message ?? e)}</p>
          <nav className={styles.navRow}>
            <Link className={styles.back} href="/">← 홈으로</Link>
            <Link className={styles.back} href="/admin">어드민으로 →</Link>
          </nav>
        </div>
      </main>
    );
  }

  if (!vm) {
    // 글이 없으면 404
    notFound();
  }

  // 예전 마크업과 변수명 호환용 별칭
  const post = {
    id: vm.id,
    title: vm.title,
    published: vm.published,
    cover_image_url: vm.cover_image_url,
  };
  const influencers = vm.influencers;
  const products = vm.products;
  const createdAt = vm.created_at ? new Date(vm.created_at) : null;

  // === 예전 레이아웃/스타일에 맞춘 마크업 ===
  return (
    <main className={styles.page}>
      {/* 커버/히어로 */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          {post.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.cover}
              src={post.cover_image_url}
              alt=""
              decoding="async"
            />
          ) : (
            <div className={styles.coverFallback} />
          )}
        </div>
      </section>

      <div className={styles.container}>
        {/* 헤더: 제목 + 메타 */}
        <header className={styles.header}>
          <h1 className={styles.title}>{post.title ?? '제목 없음'}</h1>
          <div className={styles.meta}>
            <span className={styles.badge}>{post.published ? '공개' : '비공개'}</span>
            {createdAt && (
              <time className={styles.time} dateTime={createdAt.toISOString()}>
                {createdAt.toLocaleString()}
              </time>
            )}
            <span className={styles.id}>#{post.id}</span>
          </div>
        </header>

        {/* 인플루언서 카드 */}
        <section className={styles.card}>
          <div className={styles.cardTitle}>Influencers</div>
          {influencers.length === 0 ? (
            <div className={styles.empty}>연결된 인플루언서가 없습니다.</div>
          ) : (
            <ul className={styles.infList}>
              {influencers.map((inf, i) => (
                <li key={i}>
                  <Link href={`/i/${inf.slug ?? ''}`} className={styles.infChip}>
                    <span className={styles.infAvatar}>
                      {inf.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={inf.avatar_url} alt="" />
                      ) : (
                        <span className={styles.initial}>
                          {(inf.name || inf.slug || 'U')
                            ?.toString()
                            .slice(0, 1)
                            .toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span className={styles.infText}>
                      <b>{inf.name ?? '—'}</b>
                      <small>@{inf.slug ?? '—'}</small>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 제품 카드 */}
        <section className={styles.card}>
          <div className={styles.cardTitle}>Products</div>
          {products.length === 0 ? (
            <div className={styles.empty}>연결된 제품이 없습니다.</div>
          ) : (
            <ul className={styles.prodList}>
              {products.map((pd, i) => (
                <li key={i} className={styles.prodItem}>
                  <div className={styles.prodMain}>
                    <span className={styles.prodBrand}>{pd.brand || '—'}</span>
                    <span className={styles.prodName}>{pd.name || '—'}</span>
                  </div>
                  {pd.url ? (
                    <a
                      className={styles.prodLink}
                      href={pd.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      링크 열기
                    </a>
                  ) : (
                    <span className={styles.prodLinkDisabled}>링크 없음</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 네비 */}
        <nav className={styles.navRow}>
          <Link className={styles.back} href="/">← 홈으로</Link>
          <Link className={styles.back} href="/admin">어드민으로 →</Link>
        </nav>
      </div>
    </main>
  );
}
