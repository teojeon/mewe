// src/app/i/[slug]/manage/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { canManageInfluencer } from '@/lib/acl';
import styles from '@/styles/admin.module.css';

export default async function ManagePage({ params }: { params: { slug: string } }) {
  const supabase = createServerComponentClient({ cookies });
  const { data: inf } = await supabase
    .from('influencers')
    .select('id,name,slug')
    .eq('slug', params.slug)
    .maybeSingle();
  if (!inf) notFound();

  const allowed = await canManageInfluencer(inf.id as string);
  if (!allowed) notFound();

  const { data: posts, error } = await supabase
    .from('posts')
    .select('id,title,published,created_at,cover_image_url')
    .eq('author_influencer_id', inf.id)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (
    <main className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>{inf.name ?? `@${inf.slug}`}</h1>
        <div className={styles.actions}>
          <Link className={`${styles.btn} ${styles.btnPrimary}`} href={`/post/new?author=${inf.id}`}>
            새 글
          </Link>
          <Link className={`${styles.btn} ${styles.btnGhost}`} href={`/i/${inf.slug}`}>프로필 보기</Link>
        </div>
      </div>

      <div className={styles.fieldset}>
        <div className={styles.fieldsetTitle}>포스트</div>
        {(!posts || posts.length === 0) ? (
          <div className={styles.hint}>아직 글이 없습니다.</div>
        ) : (
          <ul className={styles.linksStack}>
            {posts!.map((p: any) => (
              <li key={p.id} className={styles.linkRow} style={{ gridTemplateColumns: '1fr auto auto' }}>
                <span>{p.title ?? '—'}</span>
                <Link className={`${styles.btn} ${styles.btnGhost}`} href={`/post/${p.id}`}>열기</Link>
                <Link className={`${styles.btn} ${styles.btnSecondary}`} href={`/post/${p.id}/edit`}>편집</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
