// src/app/i/[slug]/page.tsx
import Image from 'next/image';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import styles from '@/styles/feed.module.css';
import InfluencerQuickActions from "@/components/InfluencerQuickActions";

export const dynamic = 'force-dynamic';

type Influencer = {
  id: string;
  name: string | null;
  slug: string | null;
  avatar_url: string | null;
  links: { text?: string; url?: string }[] | null;
};

type PostCard = {
  id: string;
  cover_image_url: string | null;
};

async function getViewerRoleForInfluencer(
  supabase: ReturnType<typeof createServerComponentClient>,
  influencerId: string
): Promise<'owner' | 'editor' | 'viewer' | 'none'> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) return 'none';

  // role을 명시적 유니온으로 좁혀줌
  type MemRow = { role: 'owner' | 'editor' | 'viewer' } | { role: string } | null;

  const { data: memRaw, error } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', uid)
    .eq('influencer_id', influencerId)
    .maybeSingle();

  if (error || !memRaw) return 'none';

  const role = (memRaw as MemRow)?.role;
  if (role === 'owner' || role === 'editor') return role; // ← 여기서 타입 확정
  if (role === 'viewer') return 'viewer';
  return 'none';
}

import TrackInfluencerView from "@/components/TrackInfluencerView";

export default async function Page({ params }: { params: { slug: string } }) {
  const supabase = createServerComponentClient({ cookies });

  // 1) 인플루언서
  const { data: inf, error: e1 } = await supabase
    .from('influencers')
    .select('id,name,slug,avatar_url,links')
    .eq('slug', params.slug)
    .maybeSingle();

  if (e1) {
    return (
      <main className={styles.page}>
        <div style={{ padding: 16, color: '#b00' }}>불러오기 실패: {String(e1.message ?? e1)}</div>
      </main>
    );
  }
  if (!inf) {
    return (
      <main className={styles.page}>
        <div style={{ padding: 16, color: '#666' }}>해당 인플루언서를 찾을 수 없습니다.</div>
      </main>
    );
  }

  const influencer: Influencer = {
    id: String(inf.id),
    name: inf?.name ?? null,
    slug: inf?.slug ?? null,
    avatar_url: typeof inf?.avatar_url === 'string' ? inf.avatar_url : null,
    links: Array.isArray(inf?.links) ? inf.links : null,
  };

  // 2) 뷰어 권한 (빠른 액션 노출 용)
  const role = await getViewerRoleForInfluencer(supabase, influencer.id);
  const { data: session } = await supabase.auth.getSession();
  const hasSession = !!session?.session;

  // 3) 포스트 목록 (대표 작성자(author_influencer_id) 기준 + 다대다(posts_influencers) 보조)
  //    우선 author_influencer_id = 이 인플루언서
  const { data: postsA, error: pErrA } = await supabase
    .from('posts')
    .select('id,cover_image_url,author_influencer_id')
    .eq('author_influencer_id', influencer.id)
    .order('created_at', { ascending: false });

  //    보조: posts_influencers 관계에 걸린 포스트(중복 제거)
  const { data: postsB, error: pErrB } = await supabase
    .from('posts_influencers')
    .select('post_id, posts ( id, cover_image_url )')
    .eq('influencer_id', influencer.id);

  if (pErrA || pErrB) {
    return (
      <main className={styles.page}>
        <div style={{ padding: 16, color: '#b00' }}>
          불러오기 실패: {String(pErrA?.message ?? pErrB?.message ?? '알 수 없는 오류')}
        </div>
      </main>
    );
  }

  // Normalize + dedupe
  const listA: PostCard[] = (postsA ?? []).map((r: any) => ({
    id: String(r.id),
    cover_image_url: typeof r?.cover_image_url === 'string' ? r.cover_image_url : null,
  }));

  const listB: PostCard[] = (postsB ?? [])
    .map((row: any) => row?.posts ?? null)
    .filter(Boolean)
    .map((p: any) => ({
      id: String(p.id),
      cover_image_url: typeof p?.cover_image_url === 'string' ? p.cover_image_url : null,
    }));

  const seen = new Set<string>();
  const posts: PostCard[] = [];
  for (const p of [...listA, ...listB]) {
    if (!seen.has(p.id)) {
      posts.push(p);
      seen.add(p.id);
    }
  }

  // 4) UI
  return (
    <main className={styles.page}>
      {/* 상단 프로필 카드 */}
      <section className={styles.profileCard}>
        <div className={styles.avatarWrap}>
          {influencer.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={influencer.avatar_url} alt="" className={styles.avatarImg} />
          ) : (
            <div className={styles.avatarFallback}>
              {influencer.name?.slice(0, 1) ?? '·'}
            </div>
          )}
        </div>

        <div className={styles.profileText}>
          <div className={styles.profileTitle}>{influencer.name ?? ''}</div>
          <p className={styles.profileHandle}>@{influencer.slug ?? '—'}</p>
        </div>

      </section>
{/* 빠른 액션: 새 글 / 관리 (모바일 2열 가로 가득) */}
<section className={styles.quickActionsWrap}>
  <InfluencerQuickActions
    influencerId={influencer.id}
    slug={influencer.slug ?? ""}
    containerClassName={styles.quickActionsBar}
  />
</section>
      {/* 링크 카드 */}
      <section className={styles.linksCard}>
        <div className={styles.linksRow}>
          <ul className={styles.linkBtns}>
            {Array.isArray(influencer.links) && influencer.links.length > 0 ? (
              influencer.links.map((lnk, i) => {
                const text = typeof lnk?.text === 'string' && lnk.text.trim().length > 0
                  ? lnk.text
                  : (typeof lnk?.url === 'string' ? lnk.url : '');
                const url = typeof lnk?.url === 'string' ? lnk.url : '';
                if (!url) return null;
                // http/https 미지정 시 https로 보정, //로 시작하면 https: 붙이기
                const nurl = /^(https?:)?\/\//i.test(url) ? (url.startsWith('//') ? `https:${url}` : url) : `https://${url}`;
                return (
                    <li key={i}>
                      <a className={styles.linkBtn} href={nurl} target="_blank" rel="noopener noreferrer">
                         {text}
                          </a>
                          </li>
                    );
              })
            ) : (
              <li className={styles.linksEmpty}>등록된 링크가 없습니다.</li>
            )}
          </ul>
        </div>
      </section>

      {/* 3열 그리드 피드 */}
      <section>
        <div className={styles.grid3}>
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/post/${p.id}`}  // 🔑 반드시 절대경로로 이동
              className={styles.card}
              prefetch
            >
              <div className={styles.thumb}>
                {p.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.cover_image_url} alt="" className={styles.imgFill} />
                ) : (
                  <div className={styles.imgFill} style={{ background: '#e9ecf1' }} />
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
