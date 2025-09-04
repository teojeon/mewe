// src/app/post/[id]/actions.ts
'use server';

import { cookies } from 'next/headers';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';

/**
 * 권한은 RLS가 최종 판단 (작성자 or 대표 인플루언서 owner만 삭제 가능).
 * 삭제 후에는 해당 인플루언서 프로필(i/[slug])로 이동, slug 없으면 홈으로 이동.
 */
export async function deletePostAction(postId: string, slug: string | null) {
  const supabase = createServerActionClient({ cookies });

  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) {
    // Next.js Server Action에서는 throw로 에러 bubbling
    throw new Error(error.message);
  }

  if (slug) redirect(`/i/${slug}`);
  redirect('/');
}
