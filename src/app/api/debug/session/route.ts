// src/app/api/debug/session/route.ts
import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  const supabase = createServerComponentClient({ cookies });
  const { data } = await supabase.auth.getSession();
  return NextResponse.json({
    user: data.session?.user ?? null,
    hasSession: !!data.session,
  });
}
