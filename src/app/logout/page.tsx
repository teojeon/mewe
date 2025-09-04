// src/app/logout/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function LogoutPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      await supabase.auth.signOut();
      router.replace('/');
    };
    run();
  }, [router, supabase]);

  return <main style={{ padding: 24 }}>로그아웃 중…</main>;
}
