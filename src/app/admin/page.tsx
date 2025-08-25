// src/app/admin/page.tsx
import Link from "next/link";
import { supabasePublic } from "@/lib/supabase-client";
import styles from "@/styles/admin.module.css";

type Row = {
  id: string;
  title: string | null;
  published: boolean | null;
  influencer?: { slug: string | null } | null; // 조인 결과
};

async function listPosts(q: string) {
  // posts + influencers.slug 조인 셀렉트
  // 관계명은 프로젝트마다 다를 수 있어 두 가지 키를 모두 시도합니다.
  const base = supabasePublic
    .from("posts")
    .select(`
      id,
      title,
      published,
      influencer:influencers ( slug )
    `) // <-- 만약 이 라인이 에러면 아래 주석의 대안을 사용하세요.
    .order("created_at", { ascending: false });

  // 제목 검색
  const { data, error } = q ? await base.ilike("title", `%${q}%`) : await base;

  // 조인이 환경에 따라 실패하면 fallback: influencers 테이블에서 slug를 한 번 더 가져오기
  if (error || !data) {
    // Fallback: 조인 없이 기본 필드만 가져온 후, 별도 조회로 slug 매핑
    const { data: rows } = await supabasePublic
      .from("posts")
      .select("id,title,published,influencer_id")
      .order("created_at", { ascending: false });
    if (!rows) return [];

    // influencer_id 모아서 in() 조회
    const ids = Array.from(new Set(rows.map((r: any) => r.influencer_id).filter(Boolean)));
    let slugMap = new Map<string, string | null>();
    if (ids.length) {
      const { data: infs } = await supabasePublic
        .from("influencers")
        .select("id,slug")
        .in("id", ids);
      if (infs) {
        slugMap = new Map(infs.map((i: any) => [i.id, i.slug]));
      }
    }

    return rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      published: r.published,
      influencer: { slug: slugMap.get(r.influencer_id ?? "") ?? null },
    }));
  }

  // 정상 조인 결과
  return (data as any[]).map((r) => ({
    id: r.id,
    title: r.title,
    published: r.published,
    influencer: r.influencer ?? null,
  })) as Row[];
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams?.q ?? "").trim();
  const rows = await listPosts(q);

  return (
    <div className={styles.wrap}>
      {/* 헤더 & 툴바 */}
      <div className={styles.header}>
        <h1 className={styles.title}>Admin</h1>
        <form className={styles.toolbar} action="/admin" method="get">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="제목 검색…"
            className={styles.input}
          />
          <button className={styles.btnGhost} type="submit">검색</button>
          <Link href="/admin/new" className={styles.btn}>
            새글
          </Link>
        </form>
      </div>

      {/* 목록 섹션 */}
      <section className={styles.section}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>제목</th>
              <th className={styles.th}>상태</th>
              <th className={styles.th}>인플루언서(slug)</th> {/* ✅ 작성일 대신 slug */}
              <th className={styles.th}>작업</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className={styles.td}>
                  <Link href={`/post/${r.id}`} className={styles.linkBtn} style={{ border: "none", padding: 0 }}>
                    {r.title ?? "(제목 없음)"}
                  </Link>
                </td>
                <td className={styles.td}>
                  <span className={styles.badge}>
                    {r.published ? "공개" : "비공개"}
                  </span>
                </td>
                <td className={styles.td}>
                  {r.influencer?.slug ?? "-"}
                </td>
                <td className={styles.td}>
                  <div className={styles.rowActions}>
                    <Link href={`/admin/edit/${r.id}`} className={styles.linkBtn}>편집</Link>
                    <Link href={`/admin/delete/${r.id}`} className={styles.linkBtn}>삭제</Link>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className={styles.td} colSpan={4} style={{ color: "#888" }}>
                  결과가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
