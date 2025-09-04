// src/app/i/[slug]/page.tsx
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import styles from '@/styles/feed.module.css';

type LinkItem = { text: string; url: string };

export default async function InfluencerPage({
  params,
}: { params: { slug: string } }) {
  const supabase = createServerComponentClient({ cookies });

  // 1) 인플루언서
  const { data: inf, error: infErr } = await supabase
    .from('influencers')
    .select('id, name, slug, avatar_url, links')
    .eq('slug', params.slug)
    .single();

  if (infErr?.code === 'PGRST116' || (!inf && !infErr)) notFound();
  if (infErr && infErr.code !== 'PGRST116') {
    return (
      <main className={styles.page} style={{ padding: 24 }}>
        <h1>Influencer</h1>
        <p style={{ color: 'crimson' }}>불러오기 실패: {String(infErr.message || infErr)}</p>
      </main>
    );
  }

  const infId = String(inf!.id);

  // 2) 이 인플루언서의 포스트들 (제품/커버 이미지 포함)
  const { data: posts, error: postsErr } = await supabase
    .from('posts')
    .select(`
      id,
      title,
      created_at,
      published,
      cover_image_url,
      posts_influencers!inner ( influencer_id ),
      posts_products ( products ( brand, name, url, slug ) )
    `)
    .eq('posts_influencers.influencer_id', infId)
    .order('created_at', { ascending: false });

  const rows = (posts as any[] | null) ?? [];

  // 링크 보정: [{text,url}] | ["url"] → [{text:url,url}]
  const links: LinkItem[] =
    Array.isArray(inf?.links)
      ? (inf!.links as any[]).map((l) => {
          if (typeof l === 'string') return { text: l, url: l };
          const text =
            typeof l?.text === 'string'
              ? l.text
              : typeof l?.url === 'string'
              ? l.url
              : '';
          const url = typeof l?.url === 'string' ? l.url : '';
          return url ? { text: text || url, url } : null;
        }).filter(Boolean) as LinkItem[]
      : [];

  return (
    <main className={styles.page}>
      {/* 프로필 카드 */}
      <section className={styles.profileCard}>
        <div className={styles.avatarWrap}>
          {inf?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.avatarImg} alt="avatar" src={inf.avatar_url} />
          ) : (
            <div className={styles.avatarFallback}>
              {(inf?.name || inf?.slug || 'U').slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <div className={styles.profileText}>
          <div className={styles.profileTitle}>{inf?.name ?? inf?.slug}</div>
          <p className={styles.profileHandle}>@{inf?.slug}</p>
        </div>
      </section>

      {/* 링크 카드 */}
      <section className={styles.linksCard}>
        <div className={styles.linksRow}>
          {links.length === 0 ? (
            <div className={styles.linksEmpty}>등록된 링크가 없습니다.</div>
          ) : (
            <ul className={styles.linkBtns}>
              {links.map((l, i) => (
                <li key={i}>
                  <a
                    className={styles.linkBtn}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {l.text || l.url}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 3열 포스트 그리드 */}
      <section className={styles.grid3}>
        {postsErr ? (
          <div style={{ padding: 16, color: 'crimson' }}>
            포스트 불러오기 실패: {String(postsErr.message || postsErr)}
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 16, color: '#666' }}>포스트가 없습니다.</div>
        ) : (
          rows.map((p: any) => {
            const href = `/post/${p.id}`; // 상세 페이지가 있다면 이 라우트로 이동
            const cover = p?.cover_image_url as string | null;
            return (
              <article key={String(p.id)} className={styles.card}>
                <Link href={href} aria-label={p?.title ?? 'post'}>
                  <div className={styles.thumb}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {cover ? (
                      <img className={styles.imgFill} alt="" src={cover} />
                    ) : (
                      <div className={styles.imgFill} />
                    )}
                  </div>
                </Link>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
