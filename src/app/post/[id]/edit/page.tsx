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

  const onCoverChange = (file: File | null) => {
    setCoverFile(file);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  };

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
        // 2) 권한 확인: 내 user.id
        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id;
        if (!uid || !row.author_influencer_id) {
          setBlocked(true);
        } else {
          // 내 memberships 중 owner/editor 인지 확인
          const { data: mem, error: memErr } = await supabase
            .from('memberships')
            .select('role')
            .eq('user_id', uid)
            .eq('influencer_id', row.author_influencer_id)
            .in('role', ['owner', 'editor'])
            .maybeSingle();
          if (memErr || !mem) {
            setBlocked(true);
          }
        }

        // 3) 폼 채우기
        setTitle(row.title ?? '');
        setPublished(!!row.published);
        setCoverPreview(
          typeof row.cover_image_url === 'string' ? row.cover_image_url : null,
        );
        setClearCover(false);
        setCoverFile(null);
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
