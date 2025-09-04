// src/app/i/[slug]/page.tsx
import Image from "next/image";
import Link from "next/link";
import { supabasePublic } from "@/lib/supabase-client";
import styles from "@/styles/feed.module.css";

type Influencer = {
  id: string;
  name: string | null;
  slug?: string | null;
  avatar_url: string | null; // ✅ 아바타 추가
  bio: string | null;
  links: any[] | null;
};

type PostRow = {
  id: string;
  title: string | null;
  cover_image_url: string | null;
};

async function getInfluencerBySlug(slug: string): Promise<Influencer | null> {
  const { data, error } = await supabasePublic
    .from("influencers")
    .select("id,name,slug,avatar_url,bio,links") // ✅ avatar_url 포함
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }
  return (data as Influencer) ?? null;
}

async function getPostsByInfluencerId(influencer_id: string): Promise<PostRow[]> {
  const { data, error } = await supabasePublic
    .from("posts")
    .select("id,title,cover_image_url")
    .eq("influencer_id", influencer_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }
  return (data as PostRow[]) ?? [];
}

export default async function Page({ params }: { params: { slug: string } }) {
  const influencer = await getInfluencerBySlug(params.slug);
  const posts = influencer ? await getPostsByInfluencerId(influencer.id) : [];

  const name = influencer?.name ?? params.slug;
  const handle = influencer?.slug ? `@${influencer.slug}` : `@${params.slug}`;

  return (
    <div className={styles.page}>
      {/* 상단 프로필 카드: 왼쪽 아바타(원형) + 오른쪽 텍스트(Name/slug 세로) */}
      <section className={styles.profileCard}>
        <div className={styles.avatarWrap}>
          {influencer?.avatar_url ? (
            <Image
              src={influencer.avatar_url}
              alt={`${name} avatar`}
              fill
              sizes="56px"
              className={styles.avatarImg}
            />
          ) : (
            <div className={styles.avatarFallback}>
              {String(name ?? "U").slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <div className={styles.profileText}>
          <div className={styles.profileTitle}>{name}</div>
          <div className={styles.profileHandle}>{handle}</div>
        </div>
      </section>

      {/* 소개 링크 카드 (버튼/링크) */}
      <section className={styles.linksCard}>
        <div className={styles.linksRow}>
          {(influencer?.links ?? []).length > 0 ? (
            <ul className={styles.linkBtns}>
              {(influencer?.links as any[]).map((lnk, i) => {
                const url = typeof lnk === "string" ? lnk : lnk?.url;
                const label =
                  typeof lnk === "object" && lnk?.label ? lnk.label : null;
                if (!url) return null;

                let text = label ?? "";
                try {
                  if (!text) text = new URL(url).hostname.replace(/^www\./, "");
                } catch {
                  text = label || "link";
                }

                return (
                  <li key={i}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.linkBtn}
                    >
                      {text}
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className={styles.linksEmpty}>소개 링크가 없습니다.</div>
          )}
        </div>
      </section>

      {/* 3열 그리드 (화면 가득) */}
      <section className={styles.grid}>
        {posts
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
