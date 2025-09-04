// src/lib/acl.ts
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export async function getSessionUserId(): Promise<string | null> {
  const supabase = createServerComponentClient({ cookies });
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.user?.id ?? null;
}

/**
 * 현재 로그인 사용자가 특정 인플루언서의 owner/editor인지 확인
 */
export async function canManageInfluencer(influencerId: string): Promise<boolean> {
  if (!influencerId) return false;
  const supabase = createServerComponentClient({ cookies });
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess?.session?.user?.id;
  if (!uid) return false;

  // 본인 membership만 읽을 수 있어야 함 (RLS 필요: USING (auth.uid() = user_id))
  const { data, error } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', uid)
    .eq('influencer_id', influencerId)
    .in('role', ['owner', 'editor'])
    .maybeSingle();

  if (error) {
    // 권한 없음/정책 문제면 false로
    return false;
  }
  return !!data;
}

/**
 * 포스트 소유 주체는 대표 인플루언서이므로,
 * 대표 인플루언서 기준으로 권한 위임
 */
export async function canManagePost(authorInfluencerId: string | null): Promise<boolean> {
  if (!authorInfluencerId) return false;
  return canManageInfluencer(authorInfluencerId);
}
