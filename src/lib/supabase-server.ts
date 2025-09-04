// src/lib/supabase-server.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 개발 단계에서 환경변수 누락 시 바로 알 수 있도록 방어
if (!url || !serviceRoleKey) {
  throw new Error(
    "Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
}

/** 서버 전용 Supabase 클라이언트 (Service Role) — 싱글턴 */
export const supabaseAdmin: SupabaseClient = createClient(url, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false, // 서버 환경에서는 토큰 자동 갱신 불필요
  },
});

/** 기존 호환용: 필요 시 함수로 받아쓰고 싶을 때 */
export function supabaseServer() {
  return supabaseAdmin;
}
