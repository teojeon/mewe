// src/app/i/[slug]/manage/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import styles from '@/styles/admin.module.css';

type PostCard = {
  id: string;
  cover_image_url: string | null;
  title: string | null;
  published: boolean | null;
};

type EditProduct = { id?: string; brand: string; name: string; url: string; keep?: boolean };
type NewProduct = { brand: string; name: string; url: string };

function slugify(input: string) {
  return input.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 80);
}
function sanitizeFileName(name: string) {
  const parts = name.split('.');
  const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  const base = parts.join('.');
  const normalized = base.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const safeBase = normalized.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
  return `${safeBase || 'file'}.${safeExt || 'dat'}`;
}
const makeCoverPath = (fileName: string) => `covers/${Date.now()}-${sanitizeFileName(fileName)}`;

export default function ManagePage() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [msg, setMsg] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [influencerId, setInfluencerId] = useState<string>('');
  const [posts, setPosts] = useState<PostCard[]>([]);

  // 편집 모달
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editPostId, setEditPostId] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editPublished, setEditPublished] = useState(false);
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [editClearCover, setEditClearCover] = useState(false);

  const [origProductIds, setOrigProductIds] = useState<string[]>([]);
  const [editProducts, setEditProducts] = useState<EditProduct[]>([]);
  const [newProducts, setNewProducts] = useState<NewProduct[]>([{ brand: '', name: '', url: '' }]);

  const onEditCoverChange = (file: File | null) => {
    setEditCoverFile(file);
    setEditCoverPreview(file ? URL.createObjectURL(file) : null);
  };
  const addNewProductRow = () => setNewProducts((prev) => [...prev, { brand: '', name: '', url: '' }]);
  const removeNewProductRow = (idx: number) => setNewProducts((prev) => prev.filter((_, i) => i !== idx));
  const changeNewProduct = (idx: number, key: keyof NewProduct, value: string) =>
    setNewProducts((prev) => prev.map((v, i) => (i === idx ? { ...v, [key]: value } : v)));
  const changeEditProduct = (idx: number, key: keyof EditProduct, value: string) =>
    setEditProducts((prev) => prev.map((v, i) => (i === idx ? { ...v, [key]: value } : v)));
  const toggleKeepEditProduct = (idx: number) =>
    setEditProducts((prev) => prev.map((v, i) => (i === idx ? { ...v, keep: !v.keep } : v)));

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setMsg('');
      try {
        // influencer
        const { data: inf, error: e1 } = await supabase
          .from('influencers')
          .select('id')
          .eq('slug', params.slug)
          .maybeSingle();
        if (e1) throw e1;
        if (!inf) throw new Error('인플루언서를 찾을 수 없습니다.');
        const infId = String(inf.id);
        setInfluencerId(infId);

        // 권한
        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id;
        if (!uid) throw new Error('로그인이 필요합니다.');
        const { data: mem, error: e2 } = await supabase
          .from('memberships')
          .select('role')
          .eq('user_id', uid)
          .eq('influencer_id', infId)
          .in('role', ['owner', 'editor'])
          .maybeSingle();
        if (e2 || !mem) throw new Error('권한이 없습니다.');

        // 포스트 목록
        const { data: rows, error: e3 } = await supabase
          .from('posts')
          .select('id, title, published, cover_image_url, author_influencer_id')
          .eq('author_influencer_id', infId)
          .order('created_at', { ascending: false });
        if (e3) throw e3;

        setPosts((rows ?? []).map((r: any) => ({
          id: String(r.id),
          title: r?.title ?? null,
          published: !!r?.published,
          cover_image_url: typeof r?.cover_image_url === 'string' ? r.cover_image_url : null,
        })));
      } catch (e: any) {
        setMsg(`불러오기 실패: ${e?.message ?? e}`);
      } finally {
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug]);

  const openEdit = async (postId: string) => {
    setMsg('');
    setEditOpen(true);            // 🔑 먼저 오픈
    setEditLoading(true);         // 로딩 스피너용
    setEditPostId(postId);
    setEditTitle('');
    setEditPublished(false);
    setEditCoverPreview(null);
    setEditCoverFile(null);
    setEditClearCover(false);
    setEditProducts([]);
    setNewProducts([{ brand: '', name: '', url: '' }]);
    setOrigProductIds([]);

    try {
      const { data: p, error: e1 } = await supabase
        .from('posts')
        .select('id, title, published, cover_image_url')
        .eq('id', postId)
        .maybeSingle();
      if (e1) throw e1;
      if (!p) throw new Error('포스트가 없습니다.');

      setEditTitle(p?.title ?? '');
      setEditPublished(!!p?.published);
      setEditCoverPreview(typeof p?.cover_image_url === 'string' ? p.cover_image_url : null);

      const { data: rel, error: e2 } = await supabase
        .from('posts_products')
        .select('product_id, products ( id, brand, name, url )')
        .eq('post_id', postId);
      if (e2) throw e2;

      const exist: EditProduct[] = (rel ?? [])
        .map((row: any) => row?.products ?? null)
        .filter(Boolean)
        .map((prod: any) => ({
          id: String(prod.id),
          brand: typeof prod?.brand === 'string' ? prod.brand : '',
          name: typeof prod?.name === 'string' ? prod.name : '',
          url: typeof prod?.url === 'string' ? prod.url : '',
          keep: true,
        }));
      setEditProducts(exist);
      setOrigProductIds(exist.map((p) => p.id!).filter(Boolean) as string[]);
      // 시야에 들어오도록
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      setMsg(`편집 데이터 로드 실패: ${e?.message ?? e}`);
    } finally {
      setEditLoading(false);
    }
  };

  const saveEdit = async () => {
    setMsg('');
    try {
      if (!editPostId) return;

      // 커버 처리
      let cover_image_url: string | undefined;
      if (editClearCover) {
        cover_image_url = null as any;
      } else if (editCoverFile) {
        const key = makeCoverPath(editCoverFile.name);
        const { error: upErr } = await supabase.storage
          .from('covers')
          .upload(key, editCoverFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: editCoverFile.type || 'application/octet-stream',
          });
        if (upErr) throw upErr;
        const { data: pub } = await supabase.storage.from('covers').getPublicUrl(key);
        cover_image_url = pub?.publicUrl ?? null;
      }

      // posts
      const updateData: any = { title: editTitle.trim(), published: editPublished };
      if (cover_image_url !== undefined) updateData.cover_image_url = cover_image_url;
      const { error: upPostErr } = await supabase.from('posts').update(updateData).eq('id', editPostId);
      if (upPostErr) throw upPostErr;

      // 제품: 삭제
      const keepIds = editProducts.filter((p) => p.keep && p.id).map((p) => p.id!) as string[];
      const removeIds = origProductIds.filter((id) => !keepIds.includes(id));
      if (removeIds.length > 0) {
        const { error: delRelErr } = await supabase
          .from('posts_products')
          .delete()
          .eq('post_id', editPostId)
          .in('product_id', removeIds);
        if (delRelErr) throw delRelErr;
      }
      // 제품: 수정
      const toUpdate = editProducts
        .filter((p) => p.keep && p.id)
        .map((p) => ({ id: p.id, brand: (p.brand ?? '').trim(), name: (p.name ?? '').trim(), url: (p.url ?? '').trim() }));
      if (toUpdate.length > 0) {
        const { error: upProdErr } = await supabase.from('products').upsert(toUpdate, { onConflict: 'id' });
        if (upProdErr) throw upProdErr;
      }
      // 제품: 새로 추가
      const toCreate = newProducts
        .map((p) => ({ brand: (p.brand ?? '').trim(), name: (p.name ?? '').trim(), url: (p.url ?? '').trim() }))
        .filter((p) => p.brand || p.name || p.url)
        .map((p) => ({ ...p, slug: slugify(`${p.brand} ${p.name}` || p.url || Math.random().toString(36).slice(2)) }));
      if (toCreate.length > 0) {
        const { data: created, error: cErr } = await supabase.from('products').upsert(toCreate, { onConflict: 'slug' }).select('id');
        if (cErr) throw cErr;
        const newIds = (created ?? []).map((r: any) => String(r.id));
        if (newIds.length > 0) {
          const relRows = newIds.map((pid) => ({ post_id: editPostId, product_id: pid }));
          const { error: linkErr } = await supabase.from('posts_products').insert(relRows);
          if (linkErr) throw linkErr;
        }
      }

      // 목록 새로고침
      const { data: rows } = await supabase
        .from('posts')
        .select('id, title, published, cover_image_url')
        .eq('author_influencer_id', influencerId)
        .order('created_at', { ascending: false });
      setPosts((rows ?? []).map((r: any) => ({
        id: String(r.id),
        title: r?.title ?? null,
        published: !!r?.published,
        cover_image_url: typeof r?.cover_image_url === 'string' ? r.cover_image_url : null,
      })));

      setEditOpen(false);
      setMsg('저장되었습니다.');
    } catch (e: any) {
      setMsg(`저장 실패: ${e?.message ?? e}`);
    }
  };

  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>관리: {params.slug}</h1>
        <div className={styles.actions}>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => router.push(`/i/${params.slug}`)}>프로필 보기</button>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => router.refresh()}>새로고침</button>
        </div>
      </header>

      {msg && <div className={styles.alert}>{msg}</div>}

      {loading ? (
        <div className={styles.hint}>불러오는 중… ⏳</div>
      ) : posts.length === 0 ? (
        <div className={styles.hint}>작성한 포스트가 없습니다.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          {posts.map((p) => (
            <div key={p.id} style={{
              position: 'relative', borderRadius: 16, overflow: 'hidden',
              border: '1px solid rgba(0,0,0,0.08)', background: '#fff',
              boxShadow: '0 6px 20px rgba(0,0,0,0.06)'
            }}>
              <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', background: '#e9ecf1' }}>
                {p.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.cover_image_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : <div style={{ position: 'absolute', inset: 0, background: '#e9ecf1' }} />}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)' }} />
              </div>
              <div style={{
                display: 'flex', justifyContent: 'flex-end', gap: 8,
                padding: 10, background: '#fff', borderTop: '1px solid rgba(0,0,0,0.06)'
              }}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => openEdit(p.id)}>
                  {editLoading && editPostId === p.id ? '불러오는 중…' : '편집'}
                </button>
                <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => router.push(`/post/${p.id}`)}>
                  보기
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 편집 모달(오버레이) */}
      {editOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
          display: 'grid', placeItems: 'center', zIndex: 50
        }}>
          <div style={{
            width: 'min(860px, 92vw)', maxHeight: '90vh', overflow: 'auto',
            background: '#fff', borderRadius: 16, padding: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)'
          }}>
            <div className={styles.fieldset}>
              <div className={styles.fieldsetTitle}>포스트 편집</div>
              {editLoading ? (
                <div className={styles.hint}>불러오는 중… ⏳</div>
              ) : (
                <div className={styles.form}>
                  <label className={styles.label}>
                    제목
                    <input className={styles.input} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  </label>

                  <label className={styles.label} style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
                    <input type="checkbox" checked={editPublished} onChange={(e) => setEditPublished(e.target.checked)} />
                    <span>Published</span>
                  </label>

                  <div className={styles.label}>
                    <div className={styles.fieldsetTitle}>커버 이미지</div>
                    {editCoverPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={editCoverPreview} alt="cover" style={{ width: 160, height: 160, borderRadius: 12, objectFit: 'cover', background: '#eee' }} />
                    ) : <div className={styles.hint}>현재 커버 없음</div>}
                    <input className={styles.input} type="file" accept="image/*" onChange={(e) => onEditCoverChange(e.target.files?.[0] ?? null)} />
                    <label className={styles.label} style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                      <input type="checkbox" checked={editClearCover} onChange={(e) => setEditClearCover(e.target.checked)} />
                      <span>커버 제거(빈 값으로 설정)</span>
                    </label>
                  </div>

                  {/* 기존 제품 편집/삭제 */}
                  <div>
                    <div className={styles.fieldsetTitle}>연결된 제품 (편집/삭제)</div>
                    <div className={styles.linksStack}>
                      {editProducts.length === 0 && <div className={styles.hint}>연결된 제품이 없습니다.</div>}
                      {editProducts.map((p, i) => (
                        <div key={i} className={styles.linkRow} style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
                          <input className={styles.input} placeholder="브랜드" value={p.brand} onChange={(e) => changeEditProduct(i, 'brand', e.target.value)} />
                          <input className={styles.input} placeholder="제품명" value={p.name} onChange={(e) => changeEditProduct(i, 'name', e.target.value)} />
                          <input className={styles.input} placeholder="링크(URL)" value={p.url} onChange={(e) => changeEditProduct(i, 'url', e.target.value)} />
                          <div className={styles.rowRight}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <input type="checkbox" checked={p.keep ?? true} onChange={() => toggleKeepEditProduct(i)} />
                              <span>유지</span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 새 제품 추가 */}
                  <div>
                    <div className={styles.fieldsetTitle}>새 제품 추가 (브랜드/제품명/링크)</div>
                    <div className={styles.linksStack}>
                      {newProducts.map((row, i) => (
                        <div key={i} className={styles.linkRow} style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
                          <input className={styles.input} placeholder="브랜드" value={row.brand} onChange={(e) => changeNewProduct(i, 'brand', e.target.value)} />
                          <input className={styles.input} placeholder="제품명" value={row.name} onChange={(e) => changeNewProduct(i, 'name', e.target.value)} />
                          <input className={styles.input} placeholder="링크(URL)" value={row.url} onChange={(e) => changeNewProduct(i, 'url', e.target.value)} />
                          <div className={styles.rowRight}>
                            <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => removeNewProductRow(i)}>삭제</button>
                          </div>
                        </div>
                      ))}
                      <div className={styles.rowRight}>
                        <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={addNewProductRow}>+ 제품 추가</button>
                      </div>
                    </div>
                  </div>

                  <div className={styles.footer}>
                    <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={saveEdit}>저장</button>
                    <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setEditOpen(false)}>닫기</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
