// src/app/i/[slug]/page.tsx
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { notFound } from 'next/navigation';

type LinkItem = { text: string; url: string };

export default async function InfluencerPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createServerComponentClient({ cookies });

  // 1) 인플루언서 본문
  const { data: inf, error: infErr } = await supabase
    .from('influencers')
    .select('id, name, slug, avatar_url, links')
    .eq('slug', params.slug)
    .single();

  // 슬러그 없음 → 404
  if (!inf && !infErr) notFound();
  // no row (PostgREST가 "no rows"일 때 error가 올 수도 있음)
  if (infErr && (infErr as any).code === 'PGRST116') notFound();
  // 그 외 에러 → 에러 메시지 표시
  if (infErr && (infErr as any).code !== 'PGRST116') {
    return (
      <main style={{ padding: 24 }}>
        <h1>Influencer</h1>
        <p style={{ color: 'crimson' }}>
          불러오기 실패: {String(infErr.message || infErr)}
        </p>
      </main>
    );
  }

  const infId = String(inf!.id);

  // 2) 이 인플루언서가 연결된 포스트들 + 각 포스트의 제품 목록
  const { data: posts, error: postsErr } = await supabase
    .from('posts')
    .select(
      `
      id,
      title,
      created_at,
      published,
      posts_influencers!inner(influencer_id),
      posts_products (
        products ( name, slug, brand, url )
      )
    `.trim(),
    )
    .eq('posts_influencers.influencer_id', infId)
    .order('created_at', { ascending: false });

  const rows = (posts as any[] | null) ?? [];

  return (
    <main style={{ padding: 24, maxWidth: 880, margin: '0 auto' }}>
      <header style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
        {inf?.avatar_url ? (
          <img
            src={inf.avatar_url}
            alt={`${inf?.name ?? inf?.slug} avatar`}
            width={72}
            height={72}
            style={{ borderRadius: 12, objectFit: 'cover' }}
          />
        ) : null}
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
            {inf?.name ?? inf?.slug}
          </h1>
          <div style={{ color: '#666', fontSize: 13 }}>@{inf?.slug}</div>
        </div>
      </header>

      {/* 링크 목록 */}
      {Array.isArray(inf?.links) && inf.links.length > 0 && (
        <section style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Links</div>
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            {(inf.links as any[]).map((l, i) => {
              const text =
                typeof l?.text === 'string'
                  ? l.text
                  : typeof l?.url === 'string'
                  ? l.url
                  : '';
              const url = typeof l?.url === 'string' ? l.url : '';
              if (!url) return null;
              return (
                <li key={i}>
                  <a href={url} target="_blank" rel="noreferrer">
                    {text || url}
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
          Posts
        </div>

        {postsErr ? (
          <div style={{ color: 'crimson' }}>
            포스트 불러오기 실패: {String(postsErr.message || postsErr)}
          </div>
        ) : rows.length === 0 ? (
          <div style={{ color: '#666' }}>연결된 포스트가 없습니다.</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {rows.map((p: any) => {
              const prods = Array.isArray(p?.posts_products)
                ? p.posts_products
                    .map((pp: any) => pp?.products ?? null)
                    .filter(Boolean)
                : [];
              return (
                <div
                  key={String(p.id)}
                  style={{
                    border: '1px solid #eee',
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <strong>{p?.title ?? '제목 없음'}</strong>
                    <span style={{ color: '#666', fontSize: 12 }}>
                      {new Date(p?.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>
                    <b>Published:</b> {p?.published ? '✅' : '❌'}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>
                    <b>Products:</b>{' '}
                    {prods.length > 0
                      ? prods
                          .map(
                            (pd: any) =>
                              `${pd?.brand ? pd.brand + ' ' : ''}${pd?.name ?? '—'}` +
                              (pd?.url ? ` (${pd.url})` : ''),
                          )
                          .join(', ')
                      : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
