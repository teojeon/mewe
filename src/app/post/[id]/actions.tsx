// src/app/post/[id]/actions.tsx
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';

/**
 * 포스트 삭제 (권한: posts RLS - author의 owner/editor)
 * @param postId 포스트 UUID
 * @param redirectTo 삭제 후 이동할 경로 (예: `/i/<slug>` 또는 `/`)
 */
export async function deletePost(postId: string, redirectTo?: string) {
  const supabase = createServerActionClient({ cookies });

  // 로그인 여부 확인 (미로그인 시 RLS로도 거부되지만, 사용자 친화적 메시지 위해 선확인)
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user?.id) {
    // 비로그인이라면 그냥 홈으로 돌려보내도 되고, 로그인 페이지로 보내도 됨
    redirect('/login');
  }

  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) {
    // 실패 시에도 상세 페이지로 되돌아가게 하려면 여기서 throw를 하지 않고 쿼리스트링 등으로 전달 가능
    throw new Error(error.message);
  }

  // 캐시 무효화: 홈, 인플루언서 페이지, 관리 등 필요한 경로 갱신
  revalidatePath('/');
  if (redirectTo) {
    revalidatePath(redirectTo);
    redirect(redirectTo);
  }

  // redirectTo 미지정 시 홈으로
  redirect('/');
}
