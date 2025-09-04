// src/app/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import styles from '@/styles/feed.module.css'; // 3열 그리드/카드/버튼 재사용

type PostCard = { id: string; cover_image_url: string | null };
type InfRow = { id: string; name: string | null; slug: string | null };

export default function HomePage() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>('');
  const [posts, setPosts] = useState<PostCard[]>([]);
  const [influencers, setInfluencers] = useState<InfRow[]>([]);

  // ── 검색 모달 상태
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');

  // 데이터 로드
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setMsg('');
      try {
        const { data: prows, error: pErr } = await supabase
          .from('posts')
          .select('id, cover_image_url, published')
          .order('created_at', { ascending: false });
        if (pErr) throw pErr;

        const normPosts: PostCard[] = (prows ?? []).map((r: any) => ({
          id: String(r.id),
          cover_image_url:
            typeof r?.cover_image_url === 'string' ? r.cover_image_url : null,
        }));
        setPosts(normPosts);

        const { data: irows, error: iErr } = await supabase
          .from('influencers')
          .select('id, name, slug')
          .order('name', { ascending: true });
        if (iErr) throw iErr;

        setInfluencers(
          (irows ?? []).map((r: any) => ({
            id: String(r.id),
            name: r?.name ?? null,
            slug: r?.slug ?? null,
          })),
        );
      } catch (e: any) {
        setMsg(`불러오기 실패: ${e?.message ?? e}`);
      } finally {
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 헤더(app-header)의 검색 아이콘과 연결: 전역 훅 제공 + 커스텀 이벤트도 지원
  useEffect(() => {
    (window as any).__openSearchModal = () => setSearchOpen(true);
    (window as any).__closeSearchModal = () => setSearchOpen(false);

    const openHandler = () => setSearchOpen(true);
    window.addEventListener('open-search-modal', openHandler as any);

    return () => {
      delete (window as any).__openSearchModal;
      delete (window as any).__closeSearchModal;
      window.removeEventListener('open-search-modal', openHandler as any);
    };
  }, []);

  // 필터된 슬러그
  const filtered = influencers.filter((inf) => {
    if (!q.trim()) return true;
    const hay = `${inf.name ?? ''} ${inf.slug ?? ''}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  return (
    <main className={styles.page}>
      {/* 상태 메시지 */}
      {msg && (
        <div style={{ padding: 12, color: '#b00', fontSize: 13 }}>{msg}</div>
      )}

      {/* 3열 그리드 피드 */}
      {loading ? (
        <div style={{ padding: 16, color: '#666' }}>불러오는 중… ⏳</div>
      ) : (
        <section>
          <div className={styles.grid3}>
            {posts.map((p) => (
              <Link
                key={p.id}
                href={`/post/${p.id}`}
                className={styles.card}
                prefetch
              >
                <div className={styles.thumb}>
                  {p.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.cover_image_url}
                      alt=""
                      className={styles.imgFill} // object-fit: cover
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div
                      className={styles.imgFill}
                      style={{ background: '#e9ecf1' }}
                    />
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────
          검색 모달: @slug 리스트 → /i/[slug] 이동
         ───────────────────────────────────────────── */}
      {searchOpen && (
        <div
          onClick={() => setSearchOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(720px, 92vw)',
              maxHeight: '88vh',
              overflow: 'auto',
              background: '#fff',
              borderRadius: 16,
              padding: 16,
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
              }}
            >
              <input
                autoFocus
                placeholder="@slug 또는 이름으로 검색"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: '1px solid rgba(0,0,0,0.12)',
                  borderRadius: 12,
                  outline: 'none',
                }}
              />
              <button
                type="button"
                className={styles.linkBtn}
                onClick={() => setSearchOpen(false)}
              >
                닫기
              </button>
            </div>

            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'grid',
                gap: 8,
              }}
            >
              {filtered.length === 0 ? (
                <li style={{ color: '#666', fontSize: 13 }}>결과가 없습니다.</li>
              ) : (
                filtered.map((inf) => (
                  <li key={inf.id}>
                    <Link
                      href={`/i/${inf.slug ?? ''}`}
                      className={styles.linkBtn}
                      onClick={() => setSearchOpen(false)}
                    >
                      @{inf.slug ?? '—'}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}
