// src/lib/supabase-server.ts
import { createClient } from "@supabase/supabase-js";

export function supabaseServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } } // 선택: 세션 비보존
  );
}
