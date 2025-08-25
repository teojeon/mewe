// src/app/page.tsx
import Image from "next/image";
import Link from "next/link";
import { supabasePublic } from "@/lib/supabase-client";
import styles from "@/styles/feed.module.css";

type Row = {
  id: string;
  title: string | null;
  cover_image_url: string;   // 현재 스키마 기준
  created_at: string;
};

async function listFeed() {
  const { data, error } = await supabasePublic
    .from("posts")
    .select("id,title,cover_image_url,created_at,published")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(60);

  if (error || !data) return [];

  return data.map((r) => ({
    id: r.id,
    title: r.title ?? "",
    imageUrl: r.cover_image_url,
  }));
}

export default async function Home() {
  const items = await listFeed();

  return (
    <section className={styles.grid3}>
      {items.map((item) => (
        <article key={item.id} className={styles.card} aria-label={item.title}>
          <Link href={`/post/${item.id}`} title={item.title}>
            <div className={styles.thumb}>
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  sizes="(max-width: 440px) 33vw, 146px" /* 3열 기준 힌트 */
                  className={styles.imgFill}
                />
              ) : (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    placeItems: "center",
                    color: "#99a3ad",
                    background: "#e9ecf1",
                  }}
                >
                  이미지 없음
                </div>
              )}
            </div>
          </Link>
        </article>
      ))}
    </section>
  );
}
