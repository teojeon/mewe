// src/app/post/[id]/page.tsx
import Image from "next/image";
import { supabasePublic } from "@/lib/supabase-client";

type PostRow = {
  id: string;
  title: string | null;
  cover_image_url: string;   // 스키마 기준
  body: string | null;
  created_at: string | null;
};

async function getPost(id: string) {
  const { data, error } = await supabasePublic
    .from("posts")
    .select("id,title,cover_image_url,body,created_at")
    .eq("id", id)
    .eq("published", true)
    .single();

  if (error || !data) {
    throw new Error("Post not found");
  }

  return {
    id: data.id,
    title: data.title ?? "",
    imageUrl: data.cover_image_url,
    body: data.body,
    created_at: data.created_at,
  };
}

export default async function PostDetail({
  params,
}: {
  params: { id: string };
}) {
  const post = await getPost(params.id);

  return (
    <section style={{ display: "grid", gap: 12, padding: 12 }}>
      {/* 가로 폭 기준 정사각형 크롭 */}
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
          <div
            className="square-fill"
            style={{ display: "grid", placeItems: "center", color: "#99a3ad" }}
          >
            이미지 없음
          </div>
        )}
      </div>

      <h1 style={{ margin: "4px 0 0", fontSize: 18, lineHeight: 1.3 }}>
        {post.title}
      </h1>

      {post.created_at && (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            color: "#666",
            fontSize: 13,
          }}
        >
          <time dateTime={post.created_at}>{post.created_at}</time>
        </div>
      )}

      {post.body && (
        <p style={{ margin: "8px 0 0", color: "#333", fontSize: 14 }}>
          {post.body}
        </p>
      )}
    </section>
  );
}
