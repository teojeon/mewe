// src/app/admin/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

type PostRow = Database['public']['Tables']['posts']['Row'];
type InfluencerRow = Database['public']['Tables']['influencers']['Row'];

// 화면에서 사용하는 형태로 가공된 타입
type InfluencerLite = { name: string | null; slug: string | null } | null;

type RowPost = {
  id: number;
  title: string | null;
  created_at: string;           // ISO string
  published: boolean | null;
  influencer_id: number | null;
  influencers: InfluencerLite;  // ✅ 단일 객체 | null 로 통일
};

export default function AdminPage() {
  const supabase = useMemo(() => createClientComponentClient<Database>(), []);
  const [posts, setPosts] = useState<RowPost[]>([]);
  const [msg, setMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setMsg('');

        const { data, error } = await supabase
          .from('posts')
          .select(
            `
            id,
            title,
            created_at,
            published,
            influencer_id,
            influencers (
              name,
              slug
            )
          `
          )
          .order('created_at', { ascending: false });

        if (error) throw error;

        // ✅ influencers가 배열/객체 어떤 형태로 와도 단일 객체 | null 로 정규화
        const normalized: RowPost[] = (data ?? []).map((row: any) => {
          const raw = row?.influencers;

          const normalizedInfluencer: InfluencerLite = Array.isArray(raw)
            ? (raw[0]
                ? {
                    name:
                      typeof raw[0].name === 'string' || raw[0].name === null
                        ? raw[0].name
                        : String(raw[0].name ?? ''),
                    slug:
                      typeof raw[0].slug === 'string' || raw[0].slug === null
                        ? raw[0].slug
                        : String(raw[0].slug ?? ''),
                  }
                : null)
            : raw
            ? {
                name:
                  typeof raw.name === 'string' || raw.name === null
                    ? raw.name
                    : String(raw.name ?? ''),
                slug:
                  typeof raw.slug === 'string' || raw.slug === null
                    ? raw.slug
                    : String(raw.slug ?? ''),
              }
            : null;

        return {
            id: Number(row.id),
            title: row.title ?? null,
            created_at: typeof row.created_at === 'string' ? row.created_at : String(row.created_at),
            published: typeof row.published === 'boolean' ? row.published : Boolean(row.published),
            influencer_id:
              row.influencer_id === null || row.influencer_id === undefined
                ? null
                : Number(row.influencer_id),
            influencers: normalizedInfluencer,
          } as RowPost;
        });

        // ✅ 강제 캐스팅 제거, 정규화된 값으로 세팅
        setPosts(normalized);
      } catch (err: any) {
        setMsg(`목록을 불러오지 못했습니다: ${err?.message ?? err}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [supabase]);

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Admin · Posts</h1>
        <p className="text-sm text-gray-500">
          게시물 목록 / 인플루언서 매핑 확인용
        </p>
      </header>

      {loading && <p className="text-gray-600">불러오는 중… ⏳</p>}
      {msg && !loading && (
        <div className="rounded-lg bg-red-50 text-red-700 px-4 py-3 mb-4">
          {msg}
        </div>
      )}

      {!loading && !msg && posts.length === 0 && (
        <p className="text-gray-600">데이터가 없습니다.</p>
      )}

      {!loading && posts.length > 0 && (
        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left font-medium px-4 py-3">ID</th>
                <th className="text-left font-medium px-4 py-3">Title</th>
                <th className="text-left font-medium px-4 py-3">Influencer</th>
                <th className="text-left font-medium px-4 py-3">Published</th>
                <th className="text-left font-medium px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-3">{p.id}</td>
                  <td className="px-4 py-3">{p.title ?? '—'}</td>
                  <td className="px-4 py-3">
                    {p.influencers
                      ? `${p.influencers.name ?? '—'} (${p.influencers.slug ?? '—'})`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {p.published ? '✅' : '❌'}
                  </td>
                  <td className="px-4 py-3">
                    {new Date(p.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
