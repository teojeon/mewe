// src/app/i/[slug]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { supabasePublic } from "@/lib/supabase-client";
import styles from "@/styles/feed.module.css";

type Influencer = {
  id: string;
  name: string | null;
  bio: string | null;
};

type PostRow = {
  id: string;
  title: string | null;
  cover_image_url: string | null;
  created_at?: string | null;
};

async function getInfluencerBySlug(slug: string): Promise<Influencer | null> {
  const { data, error } = await supabasePublic
    .from("influencers")
    .select("id,name,bio")
    .eq("slug", slug)
    .single<Influencer>();

  if (error || !data) return null;
  return data;
}

async function listByInfluencerId(influencerId: string): Promise<PostRow[]> {
  const { data, error } = await supabasePublic
    .from("posts")
    .select("id,title,cover_image_url,created_at,published,influencer_id")
    .eq("published", true)
    .eq("influencer_id", influencerId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as PostRow[];
}

export default async function Page({ params }: { params: { slug: string } }) {
  const influencer = await getInfluencerBySlug(params.slug);
  const items = influencer ? await listByInfluencerId(influencer.id) : [];

  return (
    <div>
      {/* 1) 상단 100px: name + bio */}
      <section
        style={{
          height: 100,
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 6,
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          background: "#fff",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            lineHeight: 1.2,
            fontWeight: 700,
          }}
        >
          {influencer?.name ?? params.slug}
        </h2>
        {influencer?.bio ? (
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "#555",
              lineHeight: 1.4,
              whiteSpace: "pre-line",
            }}
          >
            {influencer.bio}
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: "#888" }}>소개가 없습니다.</p>
        )}
      </section>

      {/* 2) 그 아래 150px 빈 공간 */}
      <div style={{ height: 150 }} />

      {/* 3) 포스트 그리드: 3열, 1px 간격(모서리 각짐) */}
      <section className={styles.grid3}>
        {items
          .filter((it) => !!it.cover_image_url)
          .map((item) => (
            <article
              key={item.id}
              className={styles.card}
              aria-label={item.title ?? ""}
            >
              <Link href={`/post/${item.id}`} title={item.title ?? ""}>
                <div className={styles.thumb}>
                  <Image
                    src={item.cover_image_url as string}
                    alt={item.title ?? ""}
                    fill
                    sizes="(max-width: 440px) 33vw, 146px"
                    className={styles.imgFill}
                  />
                </div>
              </Link>
            </article>
          ))}
      </section>
    </div>
  );
}
