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
  post_cover_url?: string | null;
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
      .select("id, title, meta, cover_image_url")
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
    const normalizedTitle =
      typeof post?.title === "string" && post.title.trim().length > 0 ? post.title.trim() : null;
    const normalizedCover =
      typeof post?.cover_image_url === "string" && post.cover_image_url.trim().length > 0
        ? post.cover_image_url
        : null;

    return {
      ...a,
      post_title: normalizedTitle,
      post_cover_url: normalizedCover,
      brand,
      name,
      link,
    };
  });

  // 클릭수 정렬
  agg.sort((a,b) => (sortDir === "asc" ? a.clicks - b.clicks : b.clicks - a.clicks));

  const totalViews = (daily || []).reduce((s, r: any) => s + (r.page_views || 0), 0);
  const totalClicks = (daily || []).reduce((s, r: any) => s + (r.product_clicks || 0), 0);
  const ctr = totalViews ? (totalClicks / totalViews) * 100 : 0;
  const formatNumber = (value: number) => value.toLocaleString();

  return (
    <main className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>@{slug} 대시보드</h1>
        <div className={styles.filters}>
          <Link href={`/i/${slug}/dashboard?sort=desc`} className={`${styles.btn} ${styles.btnGhost}`}>클릭수 ⬇︎</Link>
          <Link href={`/i/${slug}/dashboard?sort=asc`} className={`${styles.btn} ${styles.btnGhost}`}>클릭수 ⬆︎</Link>
        </div>
      </div>

      {/* 기존 카드형 요약 (유지) */}
      <section className={styles.statGrid}>
        <div className={styles.statCard}>
          <span>전체 방문수</span>
          <strong>{formatNumber(totalViews)}</strong>
        </div>
        <div className={styles.statCard}>
          <span>제품 클릭수</span>
          <strong>{formatNumber(totalClicks)}</strong>
        </div>
        <div className={styles.statCard}>
          <span>CTR</span>
          <strong>{ctr.toFixed(1)}%</strong>
        </div>
      </section>

      {/* 일별 추이 */}
      <section className={styles.section}>
        <h3 className={styles.tableTitle}>최근 추이</h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.tableCell}>날짜</th>
                <th className={styles.tableCell}>방문</th>
                <th className={styles.tableCell}>제품 클릭</th>
              </tr>
            </thead>
            <tbody>
              {(daily || []).map((r: any) => (
                <tr key={String(r.day)} className={styles.tableRow}>
                  <td className={styles.tableCell}>{new Date(r.day).toLocaleDateString()}</td>
                  <td className={styles.tableCell}>{formatNumber(r.page_views || 0)}</td>
                  <td className={styles.tableCell}>{formatNumber(r.product_clicks || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 제품 클릭 상세 테이블 */}
      <section className={styles.section}>
        <h3 className={styles.tableTitle}>제품 클릭 상세</h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.tableCell} style={{ width: "30%" }}>Post</th>
                <th className={styles.tableCell}>브랜드</th>
                <th className={styles.tableCell}>제품명</th>
                <th className={styles.tableCell}>제품 링크</th>
                <th className={styles.tableCellRight}>클릭수</th>
              </tr>
            </thead>
            <tbody>
              {agg.map((r, i) => (
                <tr key={i} className={styles.tableRow}>
                  <td className={styles.tableCell}>
                    <div className={styles.tableCellLink}>
                      {r.post_id ? (
                        <Link
                          href={`/admin/posts/${r.post_id}`}
                          className={styles.postThumbLink}
                          aria-label={r.post_title ? `${r.post_title} 상세` : "포스트 상세"}
                        >
                          <span className={styles.postThumb}>
                            {r.post_cover_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={r.post_cover_url} alt="" className={styles.postThumbImg} />
                            ) : (
                              <span className={styles.postThumbPlaceholder}>이미지 없음</span>
                            )}
                          </span>
                        </Link>
                      ) : (
                        <span className={styles.postThumbPlaceholder}>이미지 없음</span>
                      )}
                      <span className={styles.postThumbInfo}>{r.post_title ?? "제목 없음"}</span>
                    </div>
                  </td>
                  <td className={styles.tableCell}>{r.brand ?? "-"}</td>
                  <td className={styles.tableCell}>{r.name ?? "-"}</td>
                  <td className={styles.tableCellLink}>
                    {r.link ? (
                      <a
                        href={r.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                      >
                        링크 열기
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className={styles.tableCellRight}>{formatNumber(r.clicks)}</td>
                </tr>
            ))}
          </tbody>
        </table>
        </div>
        <div className={styles.clickList}>
          {agg.map((r, i) => (
            <article key={i} className={styles.clickCard}>
              <div className={styles.clickCardHeader}>
                {r.post_id ? (
                  <Link
                    href={`/admin/posts/${r.post_id}`}
                    className={styles.postThumbLink}
                    aria-label={r.post_title ? `${r.post_title} 상세` : "포스트 상세"}
                  >
                    <span className={styles.postThumb}>
                      {r.post_cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.post_cover_url} alt="" className={styles.postThumbImg} />
                      ) : (
                        <span className={styles.postThumbPlaceholder}>이미지 없음</span>
                      )}
                    </span>
                  </Link>
                ) : (
                  <span className={styles.postThumbPlaceholder}>이미지 없음</span>
                )}
                <div className={styles.clickCardHeaderDetails}>
                  <div className={styles.clickCardTitle}>{r.post_title ?? "제목 없음"}</div>
                  <div className={styles.clickCardMetric}>{formatNumber(r.clicks)} 클릭</div>
                </div>
              </div>
              <div className={styles.clickCardMeta}>
                <span>브랜드</span>
                <strong>{r.brand ?? "-"}</strong>
                <span>제품명</span>
                <strong>{r.name ?? "-"}</strong>
              </div>
              <div className={styles.clickCardActions}>
                {r.link ? (
                  <a
                    href={r.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                  >
                    링크 열기
                  </a>
                ) : (
                  <span className={styles.clickCardEmpty}>링크 없음</span>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
