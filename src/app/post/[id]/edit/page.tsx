// src/app/post/[id]/edit/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import styles from '@/styles/admin.module.css';

type PostRow = {
  id: string;
  title: string | null;
  published: boolean | null;
  cover_image_url: string | null;
  author_influencer_id: string | null;
};

type EditProduct = { id?: string; brand: string; name: string; url: string; keep?: boolean };
type NewProduct = { brand: string; name: string; url: string };

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
  const safeBase = normalized
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
  return `${safeBase || 'file'}.${safeExt || 'dat'}`;
}
const makeCoverPath = (fileName: string) =>
  `covers/${Date.now()}-${sanitizeFileName(fileName)}`;

export default function EditPostPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClientComponentClient(), []);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>('');
  const [blocked, setBlocked] = useState(false);

  // 폼 상태
  const [title, setTitle] = useState('');
  const [published, setPublished] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [clearCover, setClearCover] = useState(false);

  // 제품 상태
  const [origProductIds, setOrigProductIds] = useState<string[]>([]);
  const [editProducts, setEditProducts] = useState<EditProduct[]>([]);
  const [newProducts, setNewProducts] = useState<NewProduct[]>([{ brand: '', name: '', url: '' }]);

  const onCoverChange = (file: File | null) => {
    setCoverFile(file);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  };

  const addNewProductRow = () => setNewProducts((prev) => [...prev, { brand: '', name: '', url: '' }]);
  const removeNewProductRow = (idx: number) => setNewProducts((prev) => prev.filter((_, i) => i !== idx));
  const changeNewProduct = (idx: number, key: keyof NewProduct, value: string) =>
    setNewProducts((prev) => prev.map((v, i) => (i === idx ? { ...v, [key]: value } : v)));

  const changeEditProduct = (idx: number, key: keyof EditProduct, value: string) =>
    setEditProducts((prev) => prev.map((v, i) => (i === idx ? { ...v, [key]: value } : v)));
  const toggleKeepEditProduct = (idx: number) =>
    setEditProducts((prev) => prev.map((v, i) => (i === idx ? { ...v, keep: !v.keep } : v)));

  // 권한 + 초기 데이터 로드
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setMsg('');
      try {
        // 1) 포스트 로드
        const { data, error } = await supabase
          .from('posts')
          .select('id, title, published, cover_image_url, author_influencer_id')
          .eq('id', params.id)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          setMsg('게시글을 찾을 수 없습니다.');
          setBlocked(true);
          return;
        }

        const row = data as PostRow;

        // 2) 권한 확인
        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id;
        if (!uid || !row.author_influencer_id) {
          setBlocked(true);
        } else {
          const { data: mem, error: memErr } = await supabase
            .from('memberships')
            .select('role')
            .eq('user_id', uid)
            .eq('influencer_id', row.author_influencer_id)
            .in('role', ['owner', 'editor'])
            .maybeSingle();
          if (memErr || !mem) setBlocked(true);
        }

        // 3) 폼 채우기
        setTitle(row.title ?? '');
        setPublished(!!row.published);
        setCoverPreview(typeof row.cover_image_url === 'string' ? row.cover_image_url : null);
        setClearCover(false);
        setCoverFile(null);

        // 4) 연결 제품
        const { data: rel, error: e2 } = await supabase
          .from('posts_products')
          .select('product_id, products ( id, brand, name, url )')
          .eq('post_id', params.id);
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
      } catch (e: any) {
        setMsg(`불러오기 실패: ${e?.message ?? e}`);
        setBlocked(true);
      } finally {
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const save = async () => {
    setMsg('');
    try {
      if (blocked) {
        setMsg('권한이 없습니다.');
        return;
      }

      // 커버 처리
      let cover_image_url: string | undefined;
      if (clearCover) {
        cover_image_url = null as any;
      } else if (coverFile) {
        const key = makeCoverPath(coverFile.name);
        const { error: upErr } = await supabase.storage
          .from('covers')
          .upload(key, coverFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: coverFile.type || 'application/octet-stream',
          });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('covers').getPublicUrl(key);
        cover_image_url = pub?.publicUrl ?? null;
      }

      // posts 업데이트
      const updateData: any = {
        title: title.trim(),
        published,
      };
      if (cover_image_url !== undefined) updateData.cover_image_url = cover_image_url;

      const { error: upPostErr } = await supabase
        .from('posts')
        .update(updateData)
        .eq('id', params.id);
      if (upPostErr) throw upPostErr;

      // === 제품 CRUD ===
      // 1) 삭제: keep=false로 바뀐 기존 제품 링크 제거
      const keepIds = editProducts.filter((p) => p.keep && p.id).map((p) => p.id!) as string[];
      const removeIds = origProductIds.filter((id) => !keepIds.includes(id));
      if (removeIds.length > 0) {
        const { error: delRelErr } = await supabase
          .from('posts_products')
          .delete()
          .eq('post_id', params.id)
          .in('product_id', removeIds);
        if (delRelErr) throw delRelErr;
      }

      // 2) 수정: 남은 기존 제품의 brand/name/url 업데이트
      const toUpdate = editProducts
        .filter((p) => p.keep && p.id)
        .map((p) => ({
          id: p.id,
          brand: (p.brand ?? '').trim(),
          name: (p.name ?? '').trim(),
          url: (p.url ?? '').trim(),
        }));
      if (toUpdate.length > 0) {
        const { error: upProdErr } = await supabase
          .from('products')
          .upsert(toUpdate, { onConflict: 'id' });
        if (upProdErr) throw upProdErr;
      }

      // 3) 추가: 신규 제품 생성 → posts_products 연결
      const toCreate = newProducts
        .map((p) => ({
          brand: (p.brand ?? '').trim(),
          name: (p.name ?? '').trim(),
          url: (p.url ?? '').trim(),
        }))
        .filter((p) => p.brand || p.name || p.url)
        .map((p) => ({
          ...p,
          slug: slugify(`${p.brand} ${p.name}` || p.url || Math.random().toString(36).slice(2)),
        }));

      if (toCreate.length > 0) {
        const { data: created, error: cErr } = await supabase
          .from('products')
          .upsert(toCreate, { onConflict: 'slug' })
          .select('id');
        if (cErr) throw cErr;
        const newIds = (created ?? []).map((r: any) => String(r.id));
        if (newIds.length > 0) {
          const relRows = newIds.map((pid) => ({ post_id: params.id, product_id: pid }));
          const { error: linkErr } = await supabase.from('posts_products').insert(relRows);
          if (linkErr) throw linkErr;
        }
      }

      router.replace(`/post/${params.id}`);
    } catch (e: any) {
      setMsg(`저장 실패: ${e?.message ?? e}`);
    }
  };

  if (loading) {
    return (
      <main className={styles.wrap}>
        <div className={styles.hint}>불러오는 중… ⏳</div>
      </main>
    );
  }

  if (blocked) {
    return (
      <main className={styles.wrap}>
        <div className={styles.alert}>이 게시글을 편집할 권한이 없습니다.</div>
        <div className={styles.footer}>
          <button
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() => router.replace(`/post/${params.id}`)}
          >
            ← 게시글로 돌아가기
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>포스트 편집</h1>
        <div className={styles.actions}>
          <button
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() => router.replace(`/post/${params.id}`)}
          >
            ← 게시글 보기
          </button>
        </div>
      </header>

      {msg && <div className={styles.alert}>{msg}</div>}

      <section>
        <div className={styles.fieldset}>
          <div className={styles.fieldsetTitle}>기본 정보</div>
          <div className={styles.form}>
            <label className={styles.label}>
              제목
              <input
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목"
              />
            </label>

            <label
              className={styles.label}
              style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}
            >
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
              />
              <span>Published</span>
            </label>

            <div className={styles.label}>
              <div className={styles.fieldsetTitle}>커버 이미지</div>
              {coverPreview ? (
                <img
                  src={coverPreview}
                  alt="cover"
                  style={{
                    width: 160,
                    height: 160,
                    borderRadius: 12,
                    objectFit: 'cover',
                    background: '#eee',
                  }}
                />
              ) : (
                <div className={styles.hint}>현재 커버 없음</div>
              )}
              <input
                className={styles.input}
                type="file"
                accept="image/*"
                onChange={(e) => onCoverChange(e.target.files?.[0] ?? null)}
              />
              <label
                className={styles.label}
                style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}
              >
                <input
                  type="checkbox"
                  checked={clearCover}
                  onChange={(e) => setClearCover(e.target.checked)}
                />
                <span>커버 제거(빈 값으로 설정)</span>
              </label>
            </div>

            {/* ===== 제품 CRUD ===== */}
            {/* 기존 연결 제품(편집/삭제) */}
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
                      <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => removeNewProductRow(i)}>삭제</button>
                    </div>
                  </div>
                ))}
                <div className={styles.rowRight}>
                  <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={addNewProductRow}>+ 제품 추가</button>
                </div>
              </div>
            </div>

            <div className={styles.footer}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={save}>
                저장
              </button>
              <button
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => router.replace(`/post/${params.id}`)}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
