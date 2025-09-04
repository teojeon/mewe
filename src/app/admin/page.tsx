// src/app/admin/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import styles from '@/styles/admin.module.css';

type InfluencerLite = {
  id: string;
  name: string | null;
  slug: string | null;
  avatar_url?: string | null;
  links?: string[] | null;
};

type ProductLite = { id: string; name: string | null; slug: string | null };

type RowPost = {
  id: string; // uuid
  title: string | null;
  created_at: string; // ISO
  published: boolean | null;
  influencers: { name: string | null; slug: string | null }[];
  products: { name: string | null; slug: string | null }[];
};

export default function AdminPage() {
  const supabase = useMemo(() => createClientComponentClient(), []);

  // 목록
  const [posts, setPosts] = useState<RowPost[]>([]);
  const [influencers, setInfluencers] = useState<InfluencerLite[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>('');

  // 인플루언서 폼
  const [infName, setInfName] = useState('');
  const [infSlug, setInfSlug] = useState('');
  const [infLinks, setInfLinks] = useState<string[]>(['']); // 동적 링크 입력
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // 포스트 폼
  const [postTitle, setPostTitle] = useState('');
  const [postPublished, setPostPublished] = useState<boolean>(false);
  const [selectedInfIds, setSelectedInfIds] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // ----------------- 데이터 로딩 -----------------
  const loadAll = async () => {
    setLoading(true);
    setMsg('');
    try {
      // 인플루언서
      {
        const { data, error } = await supabase
          .from('influencers')
          .select('id, name, slug, avatar_url, links')
          .order('name', { ascending: true });
        if (error) throw error;
        const list: InfluencerLite[] = (data ?? []).map((r: any) => ({
          id: String(r.id),
          name: r?.name ?? null,
          slug: r?.slug ?? null,
          avatar_url: r?.avatar_url ?? null,
          links: Array.isArray(r?.links) ? r.links : r?.links ? [] : [],
        }));
        setInfluencers(list);
      }

      // 제품
      {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, slug')
          .order('name', { ascending: true });
        if (error) throw error;
        setProducts(
          (data ?? []).map((r: any) => ({
            id: String(r.id),
            name: r?.name ?? null,
            slug: r?.slug ?? null,
          })),
        );
      }

      // 포스트 + 연결(인플루언서/제품)
      {
        const { data, error } = await supabase
          .from('posts')
          .select(
            `
            id,
            title,
            created_at,
            published,
            posts_influencers (
              influencers ( name, slug )
            ),
            posts_products (
              products ( name, slug )
            )
          `.trim(),
          )
          .order('created_at', { ascending: false });

        if (error) throw error;

        const normalized: RowPost[] = (data as any[] | null ?? []).map(
          (row: any) => {
            const pivInf: any[] = Array.isArray(row?.posts_influencers)
              ? row.posts_influencers
              : [];
            const infs =
              pivInf
                .map((pi) => pi?.influencers ?? null)
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
                })) ?? [];

            const pivProd: any[] = Array.isArray(row?.posts_products)
              ? row.posts_products
              : [];
            const prods =
              pivProd
                .map((pp) => pp?.products ?? null)
                .filter(Boolean)
                .map((p: any) => ({
                  name:
                    typeof p?.name === 'string' || p?.name === null
                      ? p?.name
                      : String(p?.name ?? ''),
                  slug:
                    typeof p?.slug === 'string' || p?.slug === null
                      ? p?.slug
                      : String(p?.slug ?? ''),
                })) ?? [];

            return {
              id: String(row.id),
              title: row?.title ?? null,
              created_at:
                typeof row?.created_at === 'string'
                  ? row.created_at
                  : String(row?.created_at),
              published:
                typeof row?.published === 'boolean'
                  ? row.published
                  : row?.published == null
                  ? null
                  : Boolean(row.published),
              influencers: infs,
              products: prods,
            };
          },
        );

        setPosts(normalized);
      }
    } catch (e: any) {
      setMsg(`불러오기 실패: ${e?.message ?? e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------- 핸들러 -----------------
  const onAvatarChange = (file: File | null) => {
    setAvatarFile(file);
    setAvatarPreview(file ? URL.createObjectURL(file) : null);
  };

  const addLinkRow = () => setInfLinks((prev) => [...prev, '']);
  const removeLinkRow = (idx: number) =>
    setInfLinks((prev) => prev.filter((_, i) => i !== idx));
  const changeLink = (idx: number, value: string) =>
    setInfLinks((prev) => prev.map((v, i) => (i === idx ? value : v)));

  const toggleId = (arr: string[], setArr: (v: string[]) => void, id: string) =>
    setArr(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  // ----------------- 액션: 인플루언서 생성 -----------------
  const createInfluencer = async () => {
    setMsg('');
    try {
      if (!infName.trim() || !infSlug.trim()) {
        setMsg('인플루언서 이름/슬러그를 모두 입력해 주세요.');
        return;
      }

      // 1) avatar 업로드(있으면)
      let avatar_url: string | null = null;
      if (avatarFile) {
        const path = `influencers/${Date.now()}-${avatarFile.name}`;
        const { error: upErr } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { cacheControl: '3600', upsert: false });
        if (upErr) throw upErr;

        const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
        avatar_url = pub?.publicUrl ?? null;
      }

      // 2) links 정리
      const links = infLinks.map((v) => v.trim()).filter(Boolean);

      // 3) INSERT
      const { error } = await supabase.from('influencers').insert({
        name: infName.trim(),
        slug: infSlug.trim(),
        avatar_url,
        links, // jsonb 배열로 저장
      });
      if (error) throw error;

      // 4) 리셋 & 리로드
      setInfName('');
      setInfSlug('');
      setInfLinks(['']);
      onAvatarChange(null);
      await loadAll();
      setMsg('인플루언서가 생성되었습니다.');
    } catch (e: any) {
      setMsg(`인플루언서 생성 실패: ${e?.message ?? e}`);
    }
  };

  // ----------------- 액션: 포스트 생성 + 연결(인플루언서/제품) -----------------
  const createPostWithLinks = async () => {
    setMsg('');
    try {
      if (!postTitle.trim()) {
        setMsg('포스트 제목을 입력해 주세요.');
        return;
      }

      // 1) 포스트 생성
      const { data: created, error: postErr } = await supabase
        .from('posts')
        .insert({ title: postTitle.trim(), published: postPublished })
        .select('id')
        .single();
      if (postErr) throw postErr;

      const newPostId = String(created?.id);

      // 2) 인플루언서 연결
      if (selectedInfIds.length > 0) {
        const rows = selectedInfIds.map((infId) => ({
          post_id: newPostId,
          influencer_id: infId,
        }));
        const { error: linkErr } = await supabase
          .from('posts_influencers')
          .insert(rows);
        if (linkErr) throw linkErr;
      }

      // 3) 제품 연결
      if (selectedProductIds.length > 0) {
        const rows = selectedProductIds.map((pid) => ({
          post_id: newPostId,
          product_id: pid,
        }));
        const { error: prodErr } = await supabase
          .from('posts_products')
          .insert(rows);
        if (prodErr) throw prodErr;
      }

      // 4) 리셋 & 리로드
      setPostTitle('');
      setPostPublished(false);
      setSelectedInfIds([]);
      setSelectedProductIds([]);
      await loadAll();
      setMsg('포스트가 생성되고 인플루언서/제품이 연결되었습니다.');
    } catch (e: any) {
      setMsg(`포스트 생성/연결 실패: ${e?.message ?? e}`);
    }
  };

  // ----------------- UI -----------------
  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>Admin</h1>
        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={loadAll}>
            새로고침
          </button>
        </div>
      </header>

      {msg && <div className={styles.alert}>{msg}</div>}

      {/* 인플루언서 생성 */}
      <section className="mb-6">
        <div className={styles.fieldset}>
          <div className={styles.fieldsetTitle}>새 인플루언서 생성</div>

          <div className={styles.form}>
            <label className={styles.label}>
              이름
              <input
                className={styles.input}
                placeholder="예: Alice"
                value={infName}
                onChange={(e) => setInfName(e.target.value)}
              />
            </label>

            <label className={styles.label}>
              슬러그
              <input
                className={styles.input}
                placeholder="예: alice"
                value={infSlug}
                onChange={(e) => setInfSlug(e.target.value)}
              />
              <span className={styles.help}>고유하게 관리하는 걸 추천합니다.</span>
            </label>

            {/* 아바타 업로드 */}
            <label className={styles.label}>
              아바타 이미지
              <input
                className={styles.input}
                type="file"
                accept="image/*"
                onChange={(e) => onAvatarChange(e.target.files?.[0] ?? null)}
              />
              {avatarPreview && (
                <img
                  src={avatarPreview}
                  alt="avatar preview"
                  style={{ width: 96, height: 96, borderRadius: 12, objectFit: 'cover' }}
                />
              )}
              <span className={styles.help}>
                이미지 파일을 업로드하면 저장소(avatars 버킷)에 업로드됩니다.
              </span>
            </label>

            {/* 링크 입력 */}
            <div>
              <div className={styles.fieldsetTitle}>링크(여러 개 가능)</div>
              <div className={styles.linksStack}>
                {infLinks.map((v, i) => (
                  <div key={i} className={styles.linkRow}>
                    <input
                      className={styles.input}
                      placeholder="https://example.com/..."
                      value={v}
                      onChange={(e) => changeLink(i, e.target.value)}
                    />
                    <div className={styles.rowRight}>
                      <button
                        className={`${styles.btn} ${styles.btnGhost}`}
                        onClick={() => removeLinkRow(i)}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
                <div className={styles.rowRight}>
                  <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={addLinkRow}>
                    + 링크 추가
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.footer}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={createInfluencer}>
                인플루언서 생성
              </button>
              <button
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => {
                  setInfName('');
                  setInfSlug('');
                  setInfLinks(['']);
                  onAvatarChange(null);
                }}
              >
                초기화
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 포스트 생성 + 연결 */}
      <section className="mb-6">
        <div className={styles.fieldset}>
          <div className={styles.fieldsetTitle}>새 포스트 생성 & 연결</div>

          <div className={styles.form}>
            <label className={styles.label}>
              제목
              <input
                className={styles.input}
                placeholder="포스트 제목"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
              />
            </label>

            <label className={styles.label}>
              공개 여부
              <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={postPublished}
                  onChange={(e) => setPostPublished(e.target.checked)}
                />
                <span>Published</span>
              </label>
            </label>

            {/* 연결할 인플루언서 */}
            <div>
              <div className={styles.fieldsetTitle}>연결할 인플루언서</div>
              <div className={styles.linksStack}>
                {influencers.length === 0 && (
                  <div className={styles.hint}>등록된 인플루언서가 없습니다.</div>
                )}
                {influencers.map((inf) => (
                  <label key={inf.id} className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedInfIds.includes(inf.id)}
                      onChange={() => toggleId(selectedInfIds, setSelectedInfIds, inf.id)}
                    />
                    <span>
                      {inf.name ?? '—'} ({inf.slug ?? '—'})
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* 연결할 제품 */}
            <div>
              <div className={styles.fieldsetTitle}>연결할 제품(착용)</div>
              <div className={styles.linksStack}>
                {products.length === 0 && (
                  <div className={styles.hint}>등록된 제품이 없습니다.</div>
                )}
                {products.map((p) => (
                  <label key={p.id} className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedProductIds.includes(p.id)}
                      onChange={() => toggleId(selectedProductIds, setSelectedProductIds, p.id)}
                    />
                    <span>
                      {p.name ?? '—'} ({p.slug ?? '—'})
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.footer}>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={createPostWithLinks}
              >
                생성 + 연결
              </button>
              <button
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => {
                  setPostTitle('');
                  setPostPublished(false);
                  setSelectedInfIds([]);
                  setSelectedProductIds([]);
                }}
              >
                초기화
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 현황 리스트 */}
      <section className="mb-8">
        <div className={styles.fieldset}>
          <div className={styles.fieldsetTitle}>현황 · 포스트 목록</div>

          {loading ? (
            <div className={styles.hint}>불러오는 중… ⏳</div>
          ) : posts.length === 0 ? (
            <div className={styles.hint}>데이터가 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left font-medium px-2 py-2">ID</th>
                    <th className="text-left font-medium px-2 py-2">Title</th>
                    <th className="text-left font-medium px-2 py-2">Influencers</th>
                    <th className="text-left font-medium px-2 py-2">Products</th>
                    <th className="text-left font-medium px-2 py-2">Published</th>
                    <th className="text-left font-medium px-2 py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((p) => (
                    <tr key={p.id} className="border-top">
                      <td className="px-2 py-2">{p.id}</td>
                      <td className="px-2 py-2">{p.title ?? '—'}</td>
                      <td className="px-2 py-2">
                        {p.influencers.length > 0
                          ? p.influencers
                              .map((inf) => `${inf.name ?? '—'} (${inf.slug ?? '—'})`)
                              .join(', ')
                          : '—'}
                      </td>
                      <td className="px-2 py-2">
                        {p.products.length > 0
                          ? p.products
                              .map((pd) => `${pd.name ?? '—'} (${pd.slug ?? '—'})`)
                              .join(', ')
                          : '—'}
                      </td>
                      <td className="px-2 py-2">{p.published ? '✅' : '❌'}</td>
                      <td className="px-2 py-2">
                        {new Date(p.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
