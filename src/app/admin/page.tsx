'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

type PostRow = Database['public']['Tables']['posts']['Row'];
type InfluencerRow = Database['public']['Tables']['influencers']['Row'];

type InfluencerLite = { name: string | null; slug: string | null };
type RowPost = {
  id: string | number;             // uuid 또는 bigint 모두 허용
  title: string | null;
  created_at: string;              // ISO string
  published: boolean | null;
  influencers: InfluencerLite[];   // 여러 명
};

export default function AdminPage() {
  const supabase = useMemo(() => createClientComponentClient<Database>(), []);
  const [posts, setPosts] = useState<RowPost[]>([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setMsg('');

        // ✅ 다대다(M:N): posts_influencers → influencers 조인
        const { data, error } = await supabase
          .from('posts')
          .select(`
            id,
            title,
            created_at,
            published,
            posts_influencers (
              influencers (
                name,
                slug
              )
            )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const normalized: RowPost[] = (data ?? []).map((row: any) => {
          const pivots: any[] = Array.isArray(row?.posts_influencers)
            ? row.posts_influencers
            : [];

          const influencers: InfluencerLite[] = pivots
            .map((pi) => pi?.influencers ?? null)
            .filter(Boolean)
            .map((inf: any) => ({
              name:
                typeof inf?.name === 'string' || inf?.name === null
                  ? inf?.name
                  : String(inf?.name ?? ''),
              slug:
                typeof inf?.slug === 'string' || inf?.slug === null
                  ? inf?.slug
                  : String(inf?.slug ?? ''),
            }));

          return {
            id: row.id,
            title: row.title ?? null,
            created_at:
              typeof row.created_at === 'string'
                ? row.created_at
                : String(row.created_at),
            published:
              typeof row.published === 'boolean'
                ? row.published
                : row.published == null
                ? null
                : Boolean(row.published),
            influencers,
          } as RowPost;
        });

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
        <p className="text-sm text-gray-500">게시물 목록 / 인플루언서 매핑 (M:N)</p>
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
                <th className="text-left font-medium px-4 py-3">Influencers</th>
                <th className="text-left font-medium px-4 py-3">Published</th>
                <th className="text-left font-medium px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={String(p.id)} className="border-t">
                  <td className="px-4 py-3">{String(p.id)}</td>
                  <td className="px-4 py-3">{p.title ?? '—'}</td>
                  <td className="px-4 py-3">
                    {p.influencers.length > 0
                      ? p.influencers
                          .map((inf) => `${inf.name ?? '—'} (${inf.slug ?? '—'})`)
                          .join(', ')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">{p.published ? '✅' : '❌'}</td>
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
