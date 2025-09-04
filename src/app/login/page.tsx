// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function LoginPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState<string>('');

  const signUp = async () => {
    setMsg('');
    try {
      if (!email || !pw) return setMsg('이메일/비밀번호를 입력해 주세요.');
      const { error } = await supabase.auth.signUp({ email, password: pw });
      if (error) throw error;
      setMsg('회원가입 완료! 곧바로 로그인 버튼을 눌러주세요.');
    } catch (e: any) {
      setMsg(`회원가입 실패: ${e?.message ?? e}`);
    }
  };

  const signIn = async () => {
    setMsg('');
    try {
      if (!email || !pw) return setMsg('이메일/비밀번호를 입력해 주세요.');
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) throw error;
      setMsg('로그인 성공! 잠시 후 이동합니다…');
      router.replace('/'); // 필요하면 '/i/su.zzzy_/' 등으로 바꿔도 됨
    } catch (e: any) {
      setMsg(`로그인 실패: ${e?.message ?? e}`);
    }
  };

  return (
    <main style={{ maxWidth: 420, margin: '40px auto', padding: 16 }}>
      <h1 style={{ fontWeight: 700, fontSize: 20, marginBottom: 16 }}>Login</h1>

      <label style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
        <span style={{ fontSize: 13 }}>Email</span>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd' }}
        />
      </label>

      <label style={{ display: 'grid', gap: 6, marginBottom: 16 }}>
        <span style={{ fontSize: 13 }}>Password</span>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="••••••••"
          style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd' }}
        />
      </label>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={signIn} style={{ padding: '10px 14px', borderRadius: 999, border: '1px solid #0b69ff', background: '#0b69ff', color: '#fff' }}>
          로그인
        </button>
        <button onClick={signUp} style={{ padding: '10px 14px', borderRadius: 999, border: '1px solid #ddd', background: '#fff' }}>
          (개발용) 회원가입
        </button>
      </div>

      {msg && <p style={{ marginTop: 12, color: '#444' }}>{msg}</p>}

      <p style={{ marginTop: 16, fontSize: 12, color: '#777' }}>
        * 테스트용으로 이메일/비번 회원가입 → 같은 계정으로 로그인.  
        * memberships에 등록한 이메일과 동일해야 권한이 적용돼요.
      </p>
    </main>
  );
}
