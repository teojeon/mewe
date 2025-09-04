// src/app/post/new/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import styles from '@/styles/admin.module.css';

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
  const safeBase = normalized.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
  return `${safeBase || 'file'}.${safeExt || 'dat'}`;
}
const makeCoverPath = (fileName: string) => `covers/${Date.now()}-${sanitizeFileName(fileName)}`;

export default function NewPostPage() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const router = useRouter();
  const sp = useSearchParams();

  const authorInfluencerId = sp.get('author') || '';

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>('');

  const [title, setTitle] = useState('');
  const [published, setPublished] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [newProducts, setNewProducts] = useState<NewProduct[]>([
    { brand: '', name: '', url: '' },
  ]);

  const onCoverChange = (file: File | null) => {
    setCoverFile(file);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  };

  const addProductRow = () =>
    setNewProducts((prev) => [...prev, { brand: '', name: '', url: '' }]);
  const removeProductRow = (idx: number) =>
    setNewProducts((prev) => prev.filter((_, i) => i !== idx));
  const changeProduct = (idx: number, key: keyof NewProduct, value: string) =>
    setNewProducts((prev) => prev.map((v, i) => (i === idx ? { ...v, [key]: value } : v)));

  // (선행) authorInfluencerId가 없으면 접근 막기
  useEffect(() => {
    if (!authorInfluencerId) {
      setMsg('author 파라미터가 필요합니다. i/[slug]에서 “새 글” 버튼으로 들어오세요.');
    }
  }, [authorInfluencerId]);

  const create = async () => {
    setMsg('');
    if (!authorInfluencerId) {
      setMsg('author 파라미터가 비어 있습니다.');
      return;
    }
    if (!title.trim()) {
      setMsg('제목을 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      // 0) (선택) 클라이언트에서 membership 가드
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) throw new Error('로그인이 필요합니다.');
      const { data: mem } = await supabase
        .from('memberships')
        .select('role')
        .eq('user_id', uid)
        .eq('influencer_id', authorInfluencerId)
        .in('role', ['owner', 'editor'])
        .maybeSingle();
      if (!mem) throw new Error('권한이 없습니다.');

      // 1) 커버 업로드
      let cover_image_url: string | null = null;
      if (coverFile) {
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

      // 2) posts insert (대표 인플루언서 포함)
      const { data: created, error: postErr } = await supabase
        .from('posts')
        .insert({
          title: title.trim(),
          published,
          cover_image_url,
          author_influencer_id: authorInfluencerId,
        })
        .select('id')
        .single();
      if (postErr) throw postErr;
      const newPostId = String(created?.id);

      // 3) 새 제품 upsert → 연결
      const toUpsert = newProducts
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

      if (toUpsert.length > 0) {
        const { data: upserted, error: upErr } = await supabase
          .from('products')
          .upsert(toUpsert, { onConflict: 'slug' })
          .select('id');
        if (upErr) throw upErr;
        const productIds = (upserted ?? []).map((r: any) => String(r.id));
        if (productIds.length > 0) {
          const links = productIds.map((pid) => ({ post_id: newPostId, product_id: pid }));
          const { error: linkErr } = await supabase.from('posts_products').insert(links);
          if (linkErr) throw linkErr;
        }
      }

      // 4) 끝: 상세/편집으로 이동(원하는 쪽 택1)
      // router.replace(`/post/${newPostId}`); // 상세로
      router.replace(`/post/${newPostId}/edit`); // 편집으로
    } catch (e: any) {
      setMsg(`생성 실패: ${e?.message ?? e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>새 포스트</h1>
        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => history.back()}>
            ← 뒤로가기
          </button>
        </div>
      </header>

      {msg && <div className={styles.alert}>{msg}</div>}

      <section>
        <div className={styles.fieldset}>
          <div className={styles.fieldsetTitle}>기본</div>
          <div className={styles.form}>
            <label className={styles.label}>
              제목
              <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" />
            </label>

            <label className={styles.label} style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
              <span>Published</span>
            </label>

            <div className={styles.label}>
              <div className={styles.fieldsetTitle}>커버 이미지</div>
              {coverPreview ? (
                <img
                  src={coverPreview}
                  alt="cover"
                  style={{ width: 160, height: 160, borderRadius: 12, objectFit: 'cover', background: '#eee' }}
                />
              ) : (
                <div className={styles.hint}>현재 커버 없음</div>
              )}
              <input className={styles.input} type="file" accept="image/*" onChange={(e) => onCoverChange(e.target.files?.[0] ?? null)} />
              <span className={styles.help}>covers 버킷에 업로드되어 posts.cover_image_url에 저장됩니다.</span>
            </div>

            <div>
              <div className={styles.fieldsetTitle}>제품 추가 (브랜드/제품명/링크)</div>
              <div className={styles.linksStack}>
                {newProducts.map((row, i) => (
                  <div key={i} className={styles.linkRow} style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
                    <input className={styles.input} placeholder="브랜드" value={row.brand} onChange={(e) => changeProduct(i, 'brand', e.target.value)} />
                    <input className={styles.input} placeholder="제품명" value={row.name} onChange={(e) => changeProduct(i, 'name', e.target.value)} />
                    <input className={styles.input} placeholder="링크(URL)" value={row.url} onChange={(e) => changeProduct(i, 'url', e.target.value)} />
                    <div className={styles.rowRight}>
                      <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => removeProductRow(i)}>삭제</button>
                    </div>
                  </div>
                ))}
                <div className={styles.rowRight}>
                  <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={addProductRow}>+ 제품 추가</button>
                </div>
              </div>
            </div>

            <div className={styles.footer}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={create} disabled={loading}>
                {loading ? '생성 중…' : '생성'}
              </button>
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => router.back()}>
                취소
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
