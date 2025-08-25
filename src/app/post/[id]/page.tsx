// src/app/post/[id]/page.tsx
import Image from "next/image";
import { supabasePublic } from "@/lib/supabase-client";
import styles from "@/styles/postDetail.module.css";

type PostRow = {
  id: string;
  title: string | null;
  cover_image_url: string | null;
  body: string | null;
  meta?: unknown;               // jsonb 혹은 문자열 JSON
  created_at: string | null;
};

function parseWearItems(meta: unknown): Array<{ brand?: string; name?: string; link?: string }> {
  try {
    const v: any = typeof meta === "string" ? JSON.parse(meta) : meta;
    if (!v) return [];

    const normalize = (n: any) => {
      if (n == null) return {};
      if (typeof n !== "object") return { name: String(n) };
      const link = n.link || n.url || n.product_link || n.href;
      return { brand: n.brand, name: n.name, link };
    };

    if (Array.isArray(v)) return v.map(normalize);

    const keys = ["products", "items", "wear", "list"];
    for (const k of keys) {
      const arr = v?.[k];
      if (Array.isArray(arr)) return arr.map(normalize);
    }

    if (typeof v === "object" && ("brand" in v || "name" in v)) return [normalize(v)];

    if (typeof v === "object") {
      const out: Array<{ brand?: string; name?: string; link?: string }> = [];
      for (const [k, val] of Object.entries(v)) {
        if (val == null) continue;
        if (typeof val === "string") out.push({ brand: k, name: val });
        else out.push(normalize(val));
      }
      if (out.length) return out;
    }
  } catch { /* ignore */ }
  return [];
}

async function getPost(id: string) {
  const { data, error } = await supabasePublic
    .from("posts")
    .select("id,title,cover_image_url,body,meta,created_at")
    .eq("id", id)
    .eq("published", true)
    .single<PostRow>();

  if (error || !data) {
    throw new Error("Post not found");
  }

  const wearItems = parseWearItems(data.meta);
  return {
    id: data.id,
    title: data.title ?? "",
    imageUrl: data.cover_image_url ?? undefined,
    body: data.body,
    created_at: data.created_at,
    wearItems,
  };
}

export default async function PostDetail({
  params,
}: {
  params: { id: string };
}) {
  const post = await getPost(params.id);

  return (
    <section className={styles.container}>
      {/* 메인 이미지: 가로 폭 기준 정사각형 크롭 (globals.css의 .square / .square-fill 사용) */}
      <div className="square">
        {post.imageUrl ? (
          <Image
            src={post.imageUrl}
            alt={post.title || "post image"}
            fill
            sizes="(max-width: 440px) 100vw, 440px"
            className="square-fill"
            priority
          />
        ) : (
          <div className="square-fill" style={{ display: "grid", placeItems: "center", color: "#99a3ad" }}>
            이미지 없음
          </div>
        )}
      </div>

      {/* 제목 */}
      <h1 className={styles.title}>{post.title}</h1>

      {/* 작성일 등 메타 */}
      {post.created_at && (
        <div className={styles.metaRow}>
          <time dateTime={post.created_at}>{post.created_at}</time>
        </div>
      )}

      {/* 착용 제품(meta) — created_at 아래 작은 영역 */}
<div className={styles.wearSection}>
  <div className={styles.wearTitle}>착용 제품</div>

  {post.wearItems.length > 0 ? (
    <ul className={styles.wearList}>
      {post.wearItems.map((it, idx) => {
        const text = [it.brand, it.name].filter(Boolean).join(" · ");
        if (!text) return null;
        return (
          <li key={idx} className={styles.wearItem}>
            <span className={styles.wearText}>{text}</span>
            {it.link && (
              <a
                href={it.link}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.wearBtn}
              >
                제품 더 알아보기
              </a>
            )}
          </li>
        );
      })}
    </ul>
  ) : (
    <div style={{ fontSize: 13, color: "#888" }}>등록된 정보가 없습니다.</div>
  )}
</div>


      {/* 본문 */}
      {post.body && <p className={styles.body}>{post.body}</p>}
    </section>
  );
}
