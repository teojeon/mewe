'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import styles from '@/styles/admin.module.css';

export default function NewPostPage() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const router = useRouter();
  const sp = useSearchParams();
  const author = sp.get('author') || ''; // 대표 인플루언서 id
  const [title, setTitle] = useState('');
  const [published, setPublished] = useState(false);

  const submit = async () => {
    try {
      if (!author) { alert('대표 인플루언서가 필요합니다.'); return; }
      const { data, error } = await supabase
        .from('posts')
        .insert({ title, published, author_influencer_id: author })
        .select('id')
        .single();
      if (error) throw error;
      router.replace(`/post/${data!.id}/edit`);
    } catch (e: any) {
      alert(`생성 실패: ${e?.message ?? e}`);
    }
  };

  return (
    <main className={styles.wrap}>
      <div className={styles.fieldset}>
        <div className={styles.fieldsetTitle}>새 글</div>
        <div className={styles.form}>
          <label className={styles.label}>
            제목
            <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className={styles.label} style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            <span>Published</span>
          </label>
          <div className={styles.footer}>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={submit}>생성</button>
          </div>
        </div>
      </div>
    </main>
  );
}
