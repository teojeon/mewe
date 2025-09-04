// src/app/admin/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import styles from '@/styles/admin.module.css';

// ───────────────────────────────────────────────────────────
// 타입(뷰모델)
// ───────────────────────────────────────────────────────────
type LinkItem = { text: string; url: string };
type InfluencerLite = {
  id: string;
  name: string | null;
  slug: string | null;
  avatar_url?: string | null;
  links?: LinkItem[] | null;
};
type ProductLite = {
  id: string;
  name: string | null;
  slug: string | null;
  brand?: string | null;
  url?: string | null;
};
type RowPost = {
  id: string;
  title: string | null;
  created_at: string;
  published: boolean | null;
  cover_image_url: string | null;
  influencerIds: string[]; // 현재 연결된 인플루언서 id들
  productIds: string[];    // 현재 연결된 제품 id들
  influencers: { id: string; name: string | null; slug: string | null }[];
  products: { id: string; name: string | null; slug: string | null }[];
};

function slugify(input: string) {
  return input
    .normalize('NFKD')
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
const makeAvatarPath = (fileName: string) => `influencers/${Date.now()}-${sanitizeFileName(fileName)}`;
const makeCoverPath  = (fileName: string) => `covers/${Date.now()}-${sanitizeFileName(fileName)}`;

type NewProduct = { brand: string; name: string; url: string };

export default function AdminPage() {
  const supabase = useMemo(() => createClientComponentClient(), []);

  // 목록/상태
  const [posts, setPosts] = useState<RowPost[]>([]);
  const [influencers, setInfluencers] = useState<InfluencerLite[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>('');

  // ── 인플루언서 생성 폼
  const [infName, setInfName] = useState('');
  const [infSlug, setInfSlug] = useState('');
  const [infLinks, setInfLinks] = useState<LinkItem[]>([{ text: '', url: '' }]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // ── 새 포스트 생성 폼
  const [postTitle, setPostTitle] = useState('');
  const [postPublished, setPostPublished] = useState<boolean>(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [selectedInfIds, setSelectedInfIds] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [newProducts, setNewProducts] = useState<NewProduct[]>([{ brand: '', name: '', url: '' }]);

  // ── 기존 포스트 수정(에디트) 폼
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [editPostId, setEditPostId] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');
  const [editPublished, setEditPublished] = useState<boolean>(false);
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
  const [editSelectedInfIds, setEditSelectedInfIds] = useState<string[]>([]);
  const [editSelectedProductIds, setEditSelectedProductIds] = useState<string[]>([]);
  const [editNewProducts, setEditNewProducts] = useState<NewProduct[]>([{ brand: '', name: '', url: '' }]);
  const [editClearCover, setEditClearCover] = useState<boolean>(false);

  // ───────────────────────────────────────────────────────────
  // 데이터 로딩
  // ───────────────────────────────────────────────────────────
  const loadAll = async () => {
    setLoading(true);
    setMsg('');
    try {
      // influencers
      {
        const { data, error } = await supabase
          .from('influencers')
          .select('id, name, slug, avatar_url, links')
          .order('name', { ascending: true });
        if (error) throw error;

        const list: InfluencerLite[] = (data ?? []).map((r: any) => {
          let links: LinkItem[] = [];
          const raw = r?.links;
          if (Array.isArray(raw)) {
            if (raw.every((x) => typeof x === 'object' && x && 'url' in x)) {
              links = raw.map((x: any) => ({
                text: typeof x?.text === 'string' ? x.text : typeof x?.url === 'string' ? x.url : '',
                url: typeof x?.url === 'string' ? x.url : '',
              }));
            } else if (raw.every((x) => typeof x === 'string')) {
              links = raw.map((url: string) => ({ text: url, url }));
            }
          }
          return { id: String(r.id), name: r?.name ?? null, slug: r?.slug ?? null, avatar_url: r?.avatar_url ?? null, links };
        });
        setInfluencers(list);
      }

      // products
      {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, slug, brand, url')
          .order('name', { ascending: true });
        if (error) throw error;
        setProducts((data ?? []).map((r: any) => ({
          id: String(r.id), name: r?.name ?? null, slug: r?.slug ?? null, brand: r?.brand ?? null, url: r?.url ?? null
        })));
      }

      // posts (연결된 id까지 함께)
      {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            id, title, created_at, published, cover_image_url,
            posts_influencers ( influencer_id, influencers ( id, name, slug ) ),
            posts_products ( product_id, products ( id, name, slug, brand, url ) )
          `)
          .order('created_at', { ascending: false });
        if (error) throw error;

        const normalized: RowPost[] = (data as any[] | null ?? []).map((row: any) => {
          const pivInfs = Array.isArray(row?.posts_influencers) ? row.posts_influencers : [];
          const pivProds = Array.isArray(row?.posts_products) ? row.posts_products : [];
          const infIds = pivInfs.map((pi: any) => String(pi?.influencer_id)).filter(Boolean);
          const prodIds = pivProds.map((pp: any) => String(pp?.product_id)).filter(Boolean);

          const infs = pivInfs
            .map((pi: any) => pi?.influencers ?? null).filter(Boolean)
            .map((inf: any) => ({
              id: String(inf.id),
              name: typeof inf?.name === 'string' || inf?.name === null ? inf?.name : String(inf?.name ?? ''),
              slug: typeof inf?.slug === 'string' || inf?.slug === null ? inf?.slug : String(inf?.slug ?? ''),
            }));
          const prods = pivProds
            .map((pp: any) => pp?.products ?? null).filter(Boolean)
            .map((p: any) => ({
              id: String(p.id),
              name: typeof p?.name === 'string' || p?.name === null ? p?.name : String(p?.name ?? ''),
              slug: typeof p?.slug === 'string' || p?.slug === null ? p?.slug : String(p?.slug ?? ''),
            }));

          return {
            id: String(row.id),
            title: row?.title ?? null,
            created_at: typeof row?.created_at === 'string' ? row.created_at : String(row?.created_at),
            published: typeof row?.published === 'boolean' ? row.published : row?.published == null ? null : Boolean(row.published),
            cover_image_url: typeof row?.cover_image_url === 'string' ? row.cover_image_url : null,
            influencerIds: infIds,
            productIds: prodIds,
            influencers: infs,
            products: prods,
          };
        });
        setPosts(normalized);
      }
    } catch (e: any) {
      setMsg(`불러오기 실패: ${e?.message ?? e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);

  // ───────────────────────────────────────────────────────────
  // 공통 핸들러
  // ───────────────────────────────────────────────────────────
  const onAvatarChange = (file: File | null) => {
    setAvatarFile(file);
    setAvatarPreview(file ? URL.createObjectURL(file) : null);
  };
  const onCoverChange = (file: File | null) => {
    setCoverFile(file);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  };
  const onEditCoverChange = (file: File | null) => {
    setEditCoverFile(file);
    setEditCoverPreview(file ? URL.createObjectURL(file) : null);
  };

  const addLinkRow = () => setInfLinks((prev) => [...prev, { text: '', url: '' }]);
  const removeLinkRow = (idx: number) => setInfLinks((prev) => prev.filter((_, i) => i !== idx));
  const changeLinkText = (idx: number, value: string) =>
    setInfLinks((prev) => prev.map((v, i) => (i === idx ? { ...v, text: value } : v)));
  const changeLinkUrl = (idx: number, value: string) =>
    setInfLinks((prev) => prev.map((v, i) => (i === idx ? { ...v, url: value } : v)));

  const toggleId = (arr: string[], setArr: (v: string[]) => void, id: string) =>
    setArr(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  const addProductRow = (setRows: (cb: any) => void) =>
    setRows((prev: NewProduct[]) => [...prev, { brand: '', name: '', url: '' }]);
  const removeProductRow = (setRows: (cb: any) => void, idx: number) =>
    setRows((prev: NewProduct[]) => prev.filter((_, i) => i !== idx));
  const changeProduct = (setRows: (cb: any) => void, idx: number, key: keyof NewProduct, value: string) =>
    setRows((prev: NewProduct[]) => prev.map((v, i) => (i === idx ? { ...v, [key]: value } : v)));

  // ───────────────────────────────────────────────────────────
  // 인플루언서 생성
  // ───────────────────────────────────────────────────────────
  const createInfluencer = async () => {
    setMsg('');
    try {
      if (!infName.trim() || !infSlug.trim()) {
        setMsg('인플루언서 이름/슬러그를 모두 입력해 주세요.');
        return;
      }
      // 아바타 업로드
      let avatar_url: string | null = null;
      if (avatarFile) {
        const key = makeAvatarPath(avatarFile.name);
        const { error: upErr } = await supabase.storage
          .from('avatars')
          .upload(key, avatarFile, { cacheControl: '3600', upsert: false, contentType: avatarFile.type || 'application/octet-stream' });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('avatars').getPublicUrl(key);
        avatar_url = pub?.publicUrl ?? null;
      }
      const links: LinkItem[] = infLinks
        .map(({ text, url }) => ({ text: (text ?? '').trim(), url: (url ?? '').trim() }))
        .filter((x) => x.url.length > 0);

      const { error } = await supabase.from('influencers').insert({
        name: infName.trim(),
        slug: infSlug.trim(),
        avatar_url,
        links,
      });
      if (error) throw error;

      setInfName(''); setInfSlug(''); setInfLinks([{ text: '', url: '' }]);
      setAvatarFile(null); setAvatarPreview(null);
      await loadAll();
      setMsg('인플루언서가 생성되었습니다.');
    } catch (e: any) {
      setMsg(`인플루언서 생성 실패: ${e?.message ?? e}`);
    }
  };

  // ───────────────────────────────────────────────────────────
  // 새 포스트 생성
  // ───────────────────────────────────────────────────────────
  const createPostWithLinks = async () => {
    setMsg('');
    try {
      if (!postTitle.trim()) {
        setMsg('포스트 제목을 입력해 주세요.');
        return;
      }

      // 1) 커버 업로드
      let cover_image_url: string | null = null;
      if (coverFile) {
        const key = makeCoverPath(coverFile.name);
        const { error: upErr } = await supabase.storage
          .from('covers')
          .upload(key, coverFile, { cacheControl: '3600', upsert: false, contentType: coverFile.type || 'application/octet-stream' });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('covers').getPublicUrl(key);
        cover_image_url = pub?.publicUrl ?? null;
      }

      // 2) posts insert
      const { data: created, error: postErr } = await supabase
        .from('posts')
        .insert({ title: postTitle.trim(), published: postPublished, cover_image_url })
        .select('id')
        .single();
      if (postErr) throw postErr;
      const newPostId = String(created?.id);

      // 3) 연결: 인플루언서
      if (selectedInfIds.length > 0) {
        const rows = selectedInfIds.map((infId) => ({ post_id: newPostId, influencer_id: infId }));
        const { error: linkErr } = await supabase.from('posts_influencers').insert(rows);
        if (linkErr) throw linkErr;
      }

      // 4) 새 제품 upsert
      const toUpsert = newProducts
        .map((p) => ({ brand: (p.brand ?? '').trim(), name: (p.name ?? '').trim(), url: (p.url ?? '').trim() }))
        .filter((p) => p.brand || p.name || p.url)
        .map((p) => ({ ...p, slug: slugify(`${p.brand} ${p.name}` || p.url || Math.random().toString(36).slice(2)) }));

      let createdProductIds: string[] = [];
      if (toUpsert.length > 0) {
        const { data: upserted, error: upErr } = await supabase
          .from('products')
          .upsert(toUpsert, { onConflict: 'slug' })
          .select('id');
        if (upErr) throw upErr;
        createdProductIds = (upserted ?? []).map((r: any) => String(r.id));
      }

      // 5) 연결: 제품(기존 + 새로 생성)
      const allProductIds = [...selectedProductIds, ...createdProductIds];
      if (allProductIds.length > 0) {
        const rows = allProductIds.map((pid) => ({ post_id: newPostId, product_id: pid }));
        const { error: prodErr } = await supabase.from('posts_products').insert(rows);
        if (prodErr) throw prodErr;
      }

      // 6) 리셋
      setPostTitle(''); setPostPublished(false);
      setSelectedInfIds([]); setSelectedProductIds([]);
      setNewProducts([{ brand: '', name: '', url: '' }]);
      setCoverFile(null); setCoverPreview(null);
      await loadAll();
      setMsg('포스트가 생성되고 커버/인플루언서/제품이 연결되었습니다.');
    } catch (e: any) {
      setMsg(`포스트 생성/연결 실패: ${e?.message ?? e}`);
    }
  };

  // ───────────────────────────────────────────────────────────
  // 기존 포스트 수정 (제목/공개/커버/연결)
  // ───────────────────────────────────────────────────────────
  const startEdit = (p: RowPost) => {
    setEditOpen(true);
    setEditPostId(p.id);
    setEditTitle(p.title ?? '');
    setEditPublished(!!p.published);
    setEditSelectedInfIds([...p.influencerIds]);
    setEditSelectedProductIds([...p.productIds]);
    setEditCoverPreview(p.cover_image_url);
    setEditCoverFile(null);
    setEditClearCover(false);
    setEditNewProducts([{ brand: '', name: '', url: '' }]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const cancelEdit = () => {
    setEditOpen(false);
    setEditPostId('');
    setEditTitle('');
    setEditPublished(false);
    setEditSelectedInfIds([]);
    setEditSelectedProductIds([]);
    setEditCoverPreview(null);
    setEditCoverFile(null);
    setEditClearCover(false);
    setEditNewProducts([{ brand: '', name: '', url: '' }]);
  };

  const saveEdit = async () => {
    if (!editPostId) return;
    setMsg('');
    try {
      // (A) 커버 업로드/삭제 결정
      let cover_image_url: string | undefined; // undefined면 변경 안 함
      if (editClearCover) {
        cover_image_url = null as any; // 명시적으로 NULL로
      } else if (editCoverFile) {
        const key = makeCoverPath(editCoverFile.name);
        const { error: upErr } = await supabase.storage
          .from('covers')
          .upload(key, editCoverFile, { cacheControl: '3600', upsert: false, contentType: editCoverFile.type || 'application/octet-stream' });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('covers').getPublicUrl(key);
        cover_image_url = pub?.publicUrl ?? null;
      }

      // (B) posts 업데이트
      const updateData: any = {
        title: editTitle.trim(),
        published: editPublished,
      };
      if (cover_image_url !== undefined) updateData.cover_image_url = cover_image_url;

      const { error: upPostErr } = await supabase
        .from('posts')
        .update(updateData)
        .eq('id', editPostId);
      if (upPostErr) throw upPostErr;

      // (C) 연결 재구성: 삭제 후 재삽입
      //  C-1) posts_influencers
      {
        const { error: delInfErr } = await supabase
          .from('posts_influencers')
          .delete()
          .eq('post_id', editPostId);
        if (delInfErr) throw delInfErr;

        if (editSelectedInfIds.length > 0) {
          const rows = editSelectedInfIds.map((infId) => ({ post_id: editPostId, influencer_id: infId }));
          const { error: insInfErr } = await supabase.from('posts_influencers').insert(rows);
          if (insInfErr) throw insInfErr;
        }
      }

      //  C-2) 새 제품 upsert
      let createdProductIds: string[] = [];
      const toUpsert = editNewProducts
        .map((p) => ({ brand: (p.brand ?? '').trim(), name: (p.name ?? '').trim(), url: (p.url ?? '').trim() }))
        .filter((p) => p.brand || p.name || p.url)
        .map((p) => ({ ...p, slug: slugify(`${p.brand} ${p.name}` || p.url || Math.random().toString(36).slice(2)) }));

      if (toUpsert.length > 0) {
        const { data: upserted, error: upErr } = await supabase
          .from('products')
          .upsert(toUpsert, { onConflict: 'slug' })
          .select('id');
        if (upErr) throw upErr;
        createdProductIds = (upserted ?? []).map((r: any) => String(r.id));
      }

      //  C-3) posts_products
      {
        const { error: delProdErr } = await supabase
          .from('posts_products')
          .delete()
          .eq('post_id', editPostId);
        if (delProdErr) throw delProdErr;

        const allProductIds = [...editSelectedProductIds, ...createdProductIds];
        if (allProductIds.length > 0) {
          const rows = allProductIds.map((pid) => ({ post_id: editPostId, product_id: pid }));
          const { error: insProdErr } = await supabase.from('posts_products').insert(rows);
          if (insProdErr) throw insProdErr;
        }
      }

      // (D) 완료
      await loadAll();
      cancelEdit();
      setMsg('포스트가 수정되었습니다.');
    } catch (e: any) {
      setMsg(`포스트 수정 실패: ${e?.message ?? e}`);
    }
  };

  // ───────────────────────────────────────────────────────────
  // UI
  // ───────────────────────────────────────────────────────────
  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>Admin</h1>
        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={loadAll}>새로고침</button>
        </div>
      </header>

      {msg && <div className={styles.alert}>{msg}</div>}

      {/* === 수정 드로어 === */}
      {editOpen && (
        <section className="mb-6">
          <div className={styles.fieldset}>
            <div className={styles.fieldsetTitle}>포스트 수정</div>
            <div className={styles.form}>
              <label className={styles.label}>
                제목
                <input className={styles.input} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </label>

              <label className={styles.label} style={{ display: 'inline-flex', gap: 12, alignItems: 'center' }}>
                <input type="checkbox" checked={editPublished} onChange={(e) => setEditPublished(e.target.checked)} />
                <span>Published</span>
              </label>

              {/* 커버 이미지(현재 프리뷰/교체/삭제) */}
              <div className={styles.label}>
                <div className={styles.fieldsetTitle}>커버 이미지</div>
                {editCoverPreview ? (
                  <img
                    src={editCoverPreview}
                    alt="cover preview"
                    style={{ width: 160, height: 160, borderRadius: 12, objectFit: 'cover', background: '#eee' }}
                  />
                ) : (
                  <div className={styles.hint}>현재 커버 없음</div>
                )}
                <input className={styles.input} type="file" accept="image/*" onChange={(e) => onEditCoverChange(e.target.files?.[0] ?? null)} />
                <label className={styles.label} style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                  <input type="checkbox" checked={editClearCover} onChange={(e) => setEditClearCover(e.target.checked)} />
                  <span>커버 제거(빈 값으로 설정)</span>
                </label>
              </div>

              {/* 연결: 인플루언서 */}
              <div>
                <div className={styles.fieldsetTitle}>연결할 인플루언서</div>
                <div className={styles.linksStack}>
                  {influencers.length === 0 && <div className={styles.hint}>등록된 인플루언서가 없습니다.</div>}
                  {influencers.map((inf) => (
                    <label key={inf.id} className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editSelectedInfIds.includes(inf.id)}
                        onChange={() => toggleId(editSelectedInfIds, setEditSelectedInfIds, inf.id)}
                      />
                      <span>{inf.name ?? '—'} ({inf.slug ?? '—'})</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 연결: 기존 제품 */}
              <div>
                <div className={styles.fieldsetTitle}>연결할 제품(기존)</div>
                <div className={styles.linksStack}>
                  {products.length === 0 && <div className={styles.hint}>등록된 제품이 없습니다.</div>}
                  {products.map((p) => (
                    <label key={p.id} className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editSelectedProductIds.includes(p.id)}
                        onChange={() => toggleId(editSelectedProductIds, setEditSelectedProductIds, p.id)}
                      />
                      <span>{p.brand ? `${p.brand} ` : ''}{p.name ?? '—'}{p.url ? ` (${p.url})` : ''}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 새 제품 즉시 추가 */}
              <div>
                <div className={styles.fieldsetTitle}>새 제품 추가(브랜드/제품명/링크)</div>
                <div className={styles.linksStack}>
                  {editNewProducts.map((row, i) => (
                    <div key={i} className={styles.linkRow} style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
                      <input className={styles.input} placeholder="브랜드" value={row.brand} onChange={(e) => changeProduct(setEditNewProducts, i, 'brand', e.target.value)} />
                      <input className={styles.input} placeholder="제품명" value={row.name} onChange={(e) => changeProduct(setEditNewProducts, i, 'name', e.target.value)} />
                      <input className={styles.input} placeholder="링크(URL)" value={row.url} onChange={(e) => changeProduct(setEditNewProducts, i, 'url', e.target.value)} />
                      <div className={styles.rowRight}><button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => removeProductRow(setEditNewProducts, i)}>삭제</button></div>
                    </div>
                  ))}
                  <div className={styles.rowRight}><button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => addProductRow(setEditNewProducts)}>+ 제품 추가</button></div>
                </div>
              </div>

              <div className={styles.footer}>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={saveEdit}>저장</button>
                <button className={`${styles.btn} ${styles.btnGhost}`} onClick={cancelEdit}>취소</button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* === 인플루언서 생성 === */}
      <section className="mb-6">
        <div className={styles.fieldset}>
          <div className={styles.fieldsetTitle}>새 인플루언서 생성</div>
          <div className={styles.form}>
            <label className={styles.label}>
              이름
              <input className={styles.input} value={infName} onChange={(e) => setInfName(e.target.value)} placeholder="예: Alice" />
            </label>
            <label className={styles.label}>
              슬러그
              <input className={styles.input} value={infSlug} onChange={(e) => setInfSlug(e.target.value)} placeholder="예: alice" />
              <span className={styles.help}>고유하게 관리하는 걸 추천합니다.</span>
            </label>
            <label className={styles.label}>
              아바타 이미지
              <input className={styles.input} type="file" accept="image/*" onChange={(e) => onAvatarChange(e.target.files?.[0] ?? null)} />
              {avatarPreview && (<img src={avatarPreview} alt="avatar preview" style={{ width: 96, height: 96, borderRadius: 12, objectFit: 'cover', marginTop: 8 }} />)}
              <span className={styles.help}>avatars 버킷에 업로드됩니다.</span>
            </label>
            <div>
              <div className={styles.fieldsetTitle}>링크(표시 텍스트 + URL)</div>
              <div className={styles.linksStack}>
                {infLinks.map((row, i) => (
                  <div key={i} className={styles.linkRow}>
                    <input className={styles.input} placeholder="표시 텍스트 (예: 인스타그램)" value={row.text} onChange={(e) => changeLinkText(i, e.target.value)} />
                    <input className={styles.input} placeholder="https://example.com/username" value={row.url} onChange={(e) => changeLinkUrl(i, e.target.value)} />
                    <div className={styles.rowRight}><button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => removeLinkRow(i)}>삭제</button></div>
                  </div>
                ))}
                <div className={styles.rowRight}><button className={`${styles.btn} ${styles.btnSecondary}`} onClick={addLinkRow}>+ 링크 추가</button></div>
              </div>
            </div>
            <div className={styles.footer}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={createInfluencer}>인플루언서 생성</button>
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => { setInfName(''); setInfSlug(''); setInfLinks([{ text: '', url: '' }]); setAvatarFile(null); setAvatarPreview(null); }}>초기화</button>
            </div>
          </div>
        </div>
      </section>

      {/* === 새 포스트 생성 === */}
      <section className="mb-6">
        <div className={styles.fieldset}>
          <div className={styles.fieldsetTitle}>새 포스트 생성 & 연결</div>
          <div className={styles.form}>
            <label className={styles.label}>
              제목
              <input className={styles.input} placeholder="포스트 제목" value={postTitle} onChange={(e) => setPostTitle(e.target.value)} />
            </label>
            <label className={styles.label}>
              공개 여부
              <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={postPublished} onChange={(e) => setPostPublished(e.target.checked)} />
                <span>Published</span>
              </label>
            </label>
            {/* Cover 업로드 */}
            <label className={styles.label}>
              커버 이미지
              <input className={styles.input} type="file" accept="image/*" onChange={(e) => onCoverChange(e.target.files?.[0] ?? null)} />
              {coverPreview && (<img src={coverPreview} alt="cover preview" style={{ width: 160, height: 160, borderRadius: 12, objectFit: 'cover', marginTop: 8 }} />)}
              <span className={styles.help}>covers 버킷에 업로드되어 posts.cover_image_url에 저장됩니다.</span>
            </label>

            {/* 연결 인플루언서 */}
            <div>
              <div className={styles.fieldsetTitle}>연결할 인플루언서</div>
              <div className={styles.linksStack}>
                {influencers.length === 0 && <div className={styles.hint}>등록된 인플루언서가 없습니다.</div>}
                {influencers.map((inf) => (
                  <label key={inf.id} className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={selectedInfIds.includes(inf.id)} onChange={() => toggleId(selectedInfIds, setSelectedInfIds, inf.id)} />
                    <span>{inf.name ?? '—'} ({inf.slug ?? '—'})</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 기존 제품 선택 */}
            <div>
              <div className={styles.fieldsetTitle}>연결할 제품(기존)</div>
              <div className={styles.linksStack}>
                {products.length === 0 && <div className={styles.hint}>등록된 제품이 없습니다.</div>}
                {products.map((p) => (
                  <label key={p.id} className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={selectedProductIds.includes(p.id)} onChange={() => toggleId(selectedProductIds, setSelectedProductIds, p.id)} />
                    <span>{p.brand ? `${p.brand} ` : ''}{p.name ?? '—'}{p.url ? ` (${p.url})` : ''}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 새 제품 즉시 추가 */}
            <div>
              <div className={styles.fieldsetTitle}>새 제품 추가(브랜드/제품명/링크)</div>
              <div className={styles.linksStack}>
                {newProducts.map((row, i) => (
                  <div key={i} className={styles.linkRow} style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
                    <input className={styles.input} placeholder="브랜드" value={row.brand} onChange={(e) => changeProduct(setNewProducts, i, 'brand', e.target.value)} />
                    <input className={styles.input} placeholder="제품명" value={row.name} onChange={(e) => changeProduct(setNewProducts, i, 'name', e.target.value)} />
                    <input className={styles.input} placeholder="링크(URL)" value={row.url} onChange={(e) => changeProduct(setNewProducts, i, 'url', e.target.value)} />
                    <div className={styles.rowRight}><button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => removeProductRow(setNewProducts, i)}>삭제</button></div>
                  </div>
                ))}
                <div className={styles.rowRight}><button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => addProductRow(setNewProducts)}>+ 제품 추가</button></div>
              </div>
            </div>

            <div className={styles.footer}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={createPostWithLinks}>생성 + 연결</button>
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => {
                setPostTitle(''); setPostPublished(false);
                setSelectedInfIds([]); setSelectedProductIds([]);
                setNewProducts([{ brand: '', name: '', url: '' }]);
                setCoverFile(null); setCoverPreview(null);
              }}>초기화</button>
            </div>
          </div>
        </div>
      </section>

      {/* === 현황 리스트 === */}
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
                    <th className="text-left font-medium px-2 py-2">Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((p) => (
                    <tr key={p.id} className="border-top">
                      <td className="px-2 py-2">{p.id}</td>
                      <td className="px-2 py-2">{p.title ?? '—'}</td>
                      <td className="px-2 py-2">{p.influencers.length > 0 ? p.influencers.map((inf) => `${inf.name ?? '—'} (${inf.slug ?? '—'})`).join(', ') : '—'}</td>
                      <td className="px-2 py-2">{p.products.length > 0 ? p.products.map((pd) => `${pd.name ?? '—'} (${pd.slug ?? '—'})`).join(', ') : '—'}</td>
                      <td className="px-2 py-2">{p.published ? '✅' : '❌'}</td>
                      <td className="px-2 py-2">{new Date(p.created_at).toLocaleString()}</td>
                      <td className="px-2 py-2">
                        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => startEdit(p)}>수정</button>
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
