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
  const safeBase = normalized
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);
  return `${safeBase || 'file'}.${safeExt || 'dat'}`;
}
const makeCoverPath = (fileName: string) =>
  `covers/${Date.now()}-${sanitizeFileName(fileName)}`;

export default function NewPostPage() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const router = useRouter();
  const sp = useSearchParams();

  // 🔑 i/[slug]의 “새 글” 버튼에서 붙여준 ?author=<influencer_id>
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

  // (선행) authorInfluencerId 없으면 안내
  useEffect(() => {
    if (!authorInfluencerId) {
      setMsg(
        'author 파라미터가 필요합니다. i/[slug] 페이지의 “새 글” 버튼으로 진입해 주세요.',
      );
    }
  }, [authorInfluencerId]);

  const onCoverChange = (file: File | null) => {
    setCoverFile(file);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  };

  const addProductRow = () =>
    setNewProducts((prev) => [...prev, { brand: '', name: '', url: '' }]);
  const removeProductRow = (idx: number) =>
    setNewProducts((prev) => prev.filter((_, i) => i !== idx));
  const changeProduct = (idx: number, key: keyof NewProduct, value: string) =>
    setNewProducts((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, [key]: value } : v)),
    );

  const create = async () => {
  const show = (phase: string, e: any) => {
    const msg = typeof e?.message === 'string' ? e.message : JSON.stringify(e);
    setMsg(`생성 실패 [${phase}]: ${msg}`);
  };

  setMsg('');
  if (!authorInfluencerId) return setMsg('author 파라미터가 비어 있습니다.');
  if (!title.trim()) return setMsg('제목을 입력해 주세요.');

  setLoading(true);
  try {
    // 0) 로그인/멤버십 가드
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) throw new Error('로그인이 필요합니다.');
      const { data: mem, error: memErr } = await supabase
        .from('memberships')
        .select('role')
        .eq('user_id', uid)
        .eq('influencer_id', authorInfluencerId)
        .in('role', ['owner', 'editor'])
        .maybeSingle();
      if (memErr) throw memErr;
      if (!mem) throw new Error('권한이 없습니다. (memberships 미존재)');
    } catch (e) {
      return show('멤버십 체크', e);
    }

    // 1) 커버 업로드
    let cover_image_url: string | null = null;
    try {
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
        const { data: pub } = await supabase.storage.from('covers').getPublicUrl(key);
        cover_image_url = pub?.publicUrl ?? null;
      }
    } catch (e) {
      return show('커버 업로드', e);
    }

    // 2) posts.insert (여기가 막히면 "table \"posts\"" 문구가 보일 것)
    let newPostId = '';
    try {
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
      newPostId = String(created?.id);
    } catch (e) {
      return show('posts.insert', e);
    }

    // 3) products.upsert (막히면 "table \"products\"" 문구)
    let productIds: string[] = [];
    try {
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
        productIds = (upserted ?? []).map((r: any) => String(r.id));
      }
    } catch (e) {
      return show('products.upsert', e);
    }

    // 4) posts_products.insert (막히면 "table \"posts_products\"" 문구)
    try {
      if (productIds.length > 0) {
        const links = productIds.map((pid) => ({ post_id: newPostId, product_id: pid }));
        const { error: linkErr } = await supabase.from('posts_products').insert(links);
        if (linkErr) throw linkErr;
      }
    } catch (e) {
      return show('posts_products.insert', e);
    }

    // 5) 성공
    router.replace(`/post/${newPostId}/edit`);
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
          <button
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() => router.back()}
          >
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

            {/* 커버 이미지 업로드 */}
            <div className={styles.label}>
              <div className={styles.fieldsetTitle}>커버 이미지</div>
              {coverPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
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
              <span className={styles.help}>
                covers 버킷에 업로드되어 posts.cover_image_url에 저장됩니다.
              </span>
            </div>

            {/* 새 제품 추가 폼 */}
            <div>
              <div className={styles.fieldsetTitle}>제품 추가 (브랜드/제품명/링크)</div>
              <div className={styles.linksStack}>
                {newProducts.map((row, i) => (
                  <div
                    key={i}
                    className={styles.linkRow}
                    style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}
                  >
                    <input
                      className={styles.input}
                      placeholder="브랜드"
                      value={row.brand}
                      onChange={(e) =>
                        changeProduct(i, 'brand', e.target.value)
                      }
                    />
                    <input
                      className={styles.input}
                      placeholder="제품명"
                      value={row.name}
                      onChange={(e) => changeProduct(i, 'name', e.target.value)}
                    />
                    <input
                      className={styles.input}
                      placeholder="링크(URL)"
                      value={row.url}
                      onChange={(e) => changeProduct(i, 'url', e.target.value)}
                    />
                    <div className={styles.rowRight}>
                      <button
                        className={`${styles.btn} ${styles.btnGhost}`}
                        onClick={() => removeProductRow(i)}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
                <div className={styles.rowRight}>
                  <button
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    onClick={addProductRow}
                  >
                    + 제품 추가
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.footer}>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={create}
                disabled={loading}
              >
                {loading ? '생성 중…' : '생성'}
              </button>
              <button
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => router.back()}
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
