// src/app/i/[slug]/page.tsx
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

import styles from '@/styles/feed.module.css';
import { canManageInfluencer } from '@/lib/acl';

export const dynamic = 'force-dynamic';

type InfluencerRow = {
  id: string;
  name: string | null;
  slug: string | null;
  avatar_url: string | null;
  links: string | null; // JSON string: [{url,text}]
};

type PostCard = {
  id: string;
  title: string | null;
  cover_image_url: string | null;
  created_at: string;
};

function parseLinks(jsonLike: string | null): Array<{ url?: string; text?: string }> {
  if (!jsonLike) return [];
  try {
    const arr = JSON.parse(jsonLike);
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function initials(name: string | null | undefined, slug: string | null | undefined) {
  const base = (name ?? slug ?? '').trim();
  if (!base) return '—';
  const parts = base.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

async function fetchInfluencerBySlug(slug: string): Promise<InfluencerRow | null> {
  const supabase = createServerComponentClient({ cookies });
  const { data, error } = await supabase
    .from('influencers')
    .select('id,name,slug,avatar_url,links')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    id: String((data as any).id),
    name: (data as any).name ?? null,
    slug: (data as any).slug ?? null,
    avatar_url:
      typeof (data as any).avatar_url === 'string' ? (data as any).avatar_url : null,
    links:
      typeof (data as any).links === 'string'
        ? (data as any).links
        : (data as any).links
        ? JSON.stringify((data as any).links)
        : null,
  };
}

async function fetchPublishedPostsForInfluencer(influencerId: string): Promise<PostCard[]> {
  const supabase = createServerComponentClient({ cookies });

  const { data: joined, error: e1 } = await supabase
    .from('posts')
    .select(
      `
      id, title, cover_image_url, created_at, published,
      posts_influencers!inner ( influencer_id )
    `.trim(),
    )
    .eq('posts_influencers.influencer_id', influencerId)
    .eq('published', true as any)
    .order('created_at', { ascending: false });

  if (e1) throw e1;

  const { data: authored, error: e2 } = await supabase
    .from('posts')
    .select('id,title,cover_image_url,created_at,published,author_influencer_id')
    .eq('author_influencer_id', influencerId)
    .eq('published', true as any)
    .order('created_at', { ascending: false });

  if (e2) throw e2;

  const map = new Map<string, PostCard>();
  for (const row of (joined ?? [])) {
    map.set(String((row as any).id), {
      id: String((row as any).id),
      title: (row as any).title ?? null,
      cover_image_url:
        typeof (row as any).cover_image_url === 'string'
          ? (row as any).cover_image_url
          : null,
      created_at:
        typeof (row as any).created_at === 'string'
          ? (row as any).created_at
          : String((row as any).created_at),
    });
  }
  for (const row of (authored ?? [])) {
    const k = String((row as any).id);
    if (!map.has(k)) {
      map.set(k, {
        id: k,
        title: (row as any).title ?? null,
        cover_image_url:
          typeof (row as any).cover_image_url === 'string'
            ? (row as any).cover_image_url
            : null,
        created_at:
          typeof (row as any).created_at === 'string'
            ? (row as any).created_at
            : String((row as any).created_at),
      });
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export default async function Page({ params }: { params: { slug: string } }) {
  const influencer = await fetchInfluencerBySlug(params.slug);
  if (!influencer) notFound();

  // ✅ 권한 체크: owner/editor면 true
  const manageable = await canManageInfluencer(influencer!.id);

  const links = parseLinks(influencer!.links);
  const posts = await fetchPublishedPostsForInfluencer(influencer!.id);

  return (
    <main className={styles.page}>
      {/* 상단 프로필 카드 */}
      <section className={styles.profileCard}>
        {/* 아바타 */}
        <div className={styles.avatarWrap}>
          {influencer!.avatar_url ? (
            <Image
              src={influencer!.avatar_url}
              alt={influencer!.name ?? influencer!.slug ?? ''}
              className={styles.avatarImg}
              fill
              sizes="56px"
              priority
            />
          ) : (
            <div className={styles.avatarFallback}>
              {initials(influencer!.name, influencer!.slug)}
            </div>
          )}
        </div>

        {/* 텍스트 */}
        <div className={styles.profileText}>
          <div className={styles.profileTitle}>{influencer!.name ?? '—'}</div>
          <p className={styles.profileHandle}>@{influencer!.slug ?? '—'}</p>
        </div>

        {/* 우측: 빠른 액션 (권한자에게만) */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {manageable && (
            <>
              <Link
                className={styles.linkBtn}
                href={`/post/new?author=${influencer!.id}`}
                prefetch
              >
                새 글
              </Link>
              <Link
                className={styles.linkBtn}
                href={`/i/${influencer!.slug}/manage`}
                prefetch
              >
                관리
              </Link>
            </>
          )}
        </div>
      </section>

      {/* 링크 카드 */}
      <section className={styles.linksCard}>
        <div className={styles.linksRow}>
          {links.length === 0 ? (
            <div className={styles.linksEmpty}>소개 링크가 없습니다.</div>
          ) : (
            <ul className={styles.linkBtns}>
              {links.map((l, i) => {
                const text = (typeof l?.text === 'string' && l.text.trim()) || '바로가기';
                const url = (typeof l?.url === 'string' && l.url.trim()) || '#';
                return (
                  <li key={`${i}-${url}`}>
                    <a className={styles.linkBtn} href={url} target="_blank" rel="noopener noreferrer">
                      {text}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* 3열 피드 */}
      <section className={styles.grid3}>
        {posts.length === 0 ? (
          <div className={styles.linksEmpty} style={{ gridColumn: '1 / -1', padding: 16 }}>
            아직 게시글이 없습니다.
          </div>
        ) : (
          posts.map((p) => (
            <Link key={p.id} href={`/post/${p.id}`} className={styles.card} prefetch>
              <div className={styles.thumb}>
                {p.cover_image_url ? (
                  <Image
                    src={p.cover_image_url}
                    alt={p.title ?? ''}
                    className={styles.imgFill}
                    fill
                    sizes="33vw"
                  />
                ) : (
                  <div className={styles.imgFill} />
                )}
              </div>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
