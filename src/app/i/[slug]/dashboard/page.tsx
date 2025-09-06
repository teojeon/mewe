// src/app/i/[slug]/dashboard/page.tsx
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import styles from "@/styles/admin.module.css";

type RowDaily = { day: string; page_views: number; product_clicks: number };
type ClickAgg = {
  post_id: string | null;
  product_id: string | null;
  clicks: number;
  brand?: string | null;
  name?: string | null;
  link?: string | null;
  post_title?: string | null;
};

export const dynamic = "force-dynamic";
// (선택) 서버 런타임 명시
export const runtime = "nodejs";

function normId(x: any): string | null {
  if (x === null || x === undefined) return null;
  try { return String(x); } catch { return null; }
}

function isUrl(s?: string | null) {
  if (!s) return false;
  return /^https?:\/\//i.test(s);
}

function resolveProductMeta(meta: any, pid: string | null) {
  let brand: string | null = null;
  let name: string | null = null;
  let link: string | null = null;
  const products = meta?.products;

  if (Array.isArray(products)) {
    // pid가 URL이면 link 일치 우선
    if (pid && isUrl(pid)) {
      const m = products.find((p: any) => (p?.link || p?.url) === pid);
      if (m) {
        brand = (typeof m.brand === "string" ? m.brand : null);
        name = (typeof m.name === "string" ? m.name : null);
        link = (typeof m.link === "string" ? m.link : (typeof m.url === "string" ? m.url : null));
        return { brand, name, link };
      }
    }
    // "brand|name" 포맷
    if (pid && pid.includes("|")) {
      const [b, n] = pid.split("|");
      brand = b || null; name = n || null;
      const m = products.find((p: any) => (p?.brand === brand && p?.name === name));
      if (m) {
        link = (typeof m.link === "string" ? m.link : (typeof m.url === "string" ? m.url : null));
      }
      return { brand, name, link };
    }
    // 그 외엔 첫 항목으로 약한 추정
    const m = products[0];
    if (m) {
      brand = (typeof m.brand === "string" ? m.brand : null);
      name = (typeof m.name === "string" ? m.name : null);
      link = (typeof m.link === "string" ? m.link : (typeof m.url === "string" ? m.url : null));
      return { brand, name, link };
    }
  }

  if (isUrl(pid || undefined)) { link = pid; }
  return { brand, name, link };
}

export default async function Dashboard({ params, searchParams }: { params: { slug: string }, searchParams: { sort?: string } }) {
  const slug = params.slug;
  const sortDir = (searchParams?.sort === "asc") ? "asc" : "desc";

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // 서버 전용 키 (클라 노출 금지)
  );

  // 1) 일별 지표 (기존 유지)
  const { data: daily } = await supabase
    .from("influencer_metrics_daily")
    .select("*")
    .eq("influencer_slug", slug)
    .order("day", { ascending: false })
    .limit(90);

  // 2) 제품 클릭 집계: (post_id, product_id) 기준
  const { data: clicksRaw } = await supabase
    .from("events")
    .select("post_id, product_id")
    .eq("event_type", "product_click")
    .eq("influencer_slug", slug)
    .order("created_at", { ascending: false })
    .limit(5000); // 필요 시 조정

  const countsMap = new Map<string, { post_id: string | null; product_id: string | null; clicks: number }>();
  (clicksRaw || []).forEach((r: any) => {
    const pid = normId(r.product_id);
    const ppost = normId(r.post_id);
    const key = `${ppost}__${pid}`;
    const prev = countsMap.get(key);
    if (prev) prev.clicks += 1;
    else countsMap.set(key, { post_id: ppost, product_id: pid, clicks: 1 });
  });
  let agg: ClickAgg[] = Array.from(countsMap.values());

  // 3) Post 제목/메타 보강
  const postIds = Array.from(new Set(agg.map(a => a.post_id).filter(Boolean))) as string[];
  let postsById = new Map<string, any>();
  if (postIds.length) {
    const { data: postRows } = await supabase
      .from("posts")
      .select("id, title, meta")
      .in("id", postIds);
    (postRows || []).forEach((p: any) => postsById.set(String(p.id), p));
  }
  agg = agg.map(a => {
    const post = a.post_id ? postsById.get(a.post_id) : null;
    let brand: string | null = null, name: string | null = null, link: string | null = null;
    if (post) {
      const r = resolveProductMeta(post?.meta, a.product_id);
      brand = r.brand ?? null; name = r.name ?? null; link = r.link ?? null;
    } else {
      if (isUrl(a.product_id || undefined)) link = a.product_id || null;
      if (a.product_id && a.product_id.includes("|")) {
        const [b, n] = (a.product_id || "").split("|");
        brand = b || null; name = n || null;
      }
    }
    return { ...a, post_title: post?.title ?? null, brand, name, link };
  });

  // 클릭수 정렬
  agg.sort((a,b) => (sortDir === "asc" ? a.clicks - b.clicks : b.clicks - a.clicks));

  const totalViews = (daily || []).reduce((s, r: any) => s + (r.page_views || 0), 0);
  const totalClicks = (daily || []).reduce((s, r: any) => s + (r.product_clicks || 0), 0);
  const ctr = totalViews ? (totalClicks / totalViews) * 100 : 0;

  return (
    <main className={styles.wrap}>
      <div className={styles.header}>
        <h1>@{slug} 대시보드</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/i/${slug}/dashboard?sort=desc`} className={`${styles.btn} ${styles.btnGhost}`}>클릭수 ⬇︎</Link>
          <Link href={`/i/${slug}/dashboard?sort=asc`} className={`${styles.btn} ${styles.btnGhost}`}>클릭수 ⬆︎</Link>
        </div>
      </div>

      {/* 기존 카드형 요약 (유지) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 12 }}>
        <div className={styles.banner}>전체 방문수: <b>{totalViews}</b></div>
        <div className={styles.banner}>제품 클릭수: <b>{totalClicks}</b></div>
        <div className={styles.banner}>CTR: <b>{ctr.toFixed(1)}%</b></div>
      </div>

      {/* 일별 추이 (기존 유지) */}
      <section style={{ marginTop: 8 }}>
        <h3>최근 추이</h3>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 6px" }}>
          <thead>
            <tr style={{ textAlign: "left", fontSize: 13, color: "#666" }}>
              <th>날짜</th><th>방문</th><th>제품 클릭</th>
            </tr>
          </thead>
          <tbody>
            {(daily || []).map((r: any) => (
              <tr key={String(r.day)} style={{ background: "#fff", border: "1px solid #eee" }}>
                <td style={{ padding: "8px 10px" }}>{new Date(r.day).toLocaleDateString()}</td>
                <td style={{ padding: "8px 10px" }}>{r.page_views}</td>
                <td style={{ padding: "8px 10px" }}>{r.product_clicks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 제품 클릭 상세 테이블 (신규) */}
      <section style={{ marginTop: 16 }}>
        <h3>제품 클릭 상세</h3>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 6px" }}>
          <thead>
            <tr style={{ textAlign: "left", fontSize: 13, color: "#666" }}>
              <th style={{ width: "30%" }}>Post</th>
              <th>브랜드</th>
              <th>제품명</th>
              <th>제품 링크</th>
              <th style={{ textAlign: "right" }}>클릭수</th>
            </tr>
          </thead>
          <tbody>
            {agg.map((r, i) => (
              <tr key={i} style={{ background: "#fff", border: "1px solid #eee" }}>
                <td style={{ padding: "8px 10px" }}>
                  {r.post_id ? <Link href={`/post/${r.post_id}`}>{r.post_title ?? r.post_id}</Link> : <span>-</span>}
                </td>
                <td style={{ padding: "8px 10px" }}>{r.brand ?? "-"}</td>
                <td style={{ padding: "8px 10px" }}>{r.name ?? "-"}</td>
                <td style={{ padding: "8px 10px", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.link ? <a href={r.link} target="_blank" rel="noopener noreferrer">{r.link}</a> : "-"}
                </td>
                <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>{r.clicks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
