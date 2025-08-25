// src/app/admin/new/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabasePublic } from "@/lib/supabase-client";
import styles from "@/styles/admin.module.css";

type Influencer = { id: string; slug: string | null; name: string | null };
type ProductInput = { brand: string; name: string; link: string };

export default function AdminNew() {
  // ===== Influencer 목록 =====
  const [infLoading, setInfLoading] = useState(false);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [infError, setInfError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setInfLoading(true);
        const { data, error } = await supabasePublic
          .from("influencers")
          .select("id,slug,name")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setInfluencers((data ?? []) as Influencer[]);
      } catch (e: any) {
        setInfError(e?.message ?? "Failed to load influencers");
      } finally {
        setInfLoading(false);
      }
    })();
  }, []);

  // ===== Influencer 생성 =====
  const [infSlug, setInfSlug] = useState("");
  const [infName, setInfName] = useState("");
  const [infBio, setInfBio] = useState("");
  const [infSubmitting, setInfSubmitting] = useState(false);
  const [infMsg, setInfMsg] = useState<string | null>(null);

  async function handleCreateInfluencer(e: React.FormEvent) {
    e.preventDefault();
    setInfMsg(null);
    if (!infSlug.trim() || !infName.trim()) {
      setInfMsg("slug와 name은 필수입니다.");
      return;
    }
    try {
      setInfSubmitting(true);
      const { data, error } = await supabasePublic
        .from("influencers")
        .insert([{ slug: infSlug.trim(), name: infName.trim(), bio: infBio || null }])
        .select("id")
        .single();
      if (error) throw error;
      setInfMsg(`인플루언서 생성 성공! id=${data?.id ?? "?"}`);

      const { data: refreshed } = await supabasePublic
        .from("influencers")
        .select("id,slug,name")
        .order("created_at", { ascending: false });
      setInfluencers((refreshed ?? []) as Influencer[]);

      setInfSlug(""); setInfName(""); setInfBio("");
    } catch (err: any) {
      setInfMsg(`실패: ${err?.message ?? String(err)}`);
    } finally {
      setInfSubmitting(false);
    }
  }

  // ===== Post 생성 =====
  const [postInfId, setPostInfId] = useState<string>("");
  const [postTitle, setPostTitle] = useState("");
  const [postCover, setPostCover] = useState("");
  const [postBody, setPostBody] = useState("");
  const [postPublished, setPostPublished] = useState<boolean>(true);
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postMsg, setPostMsg] = useState<string | null>(null);
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);

  const [products, setProducts] = useState<ProductInput[]>([
    { brand: "", name: "", link: "" },
  ]);

  function addRow() {
    setProducts((prev) => [...prev, { brand: "", name: "", link: "" }]);
  }
  function removeRow(index: number) {
    setProducts((prev) => prev.filter((_, i) => i !== index));
  }
  function updateRow(index: number, key: keyof ProductInput, value: string) {
    setProducts((prev) => prev.map((p, i) => (i === index ? { ...p, [key]: value } : p)));
  }

  const cleanedProducts = useMemo(
    () =>
      products
        .map(({ brand, name, link }) => ({
          brand: brand.trim(),
          name: name.trim(),
          link: link.trim(),
        }))
        .filter((p) => p.brand || p.name || p.link),
    [products]
  );

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    setPostMsg(null);
    if (!postInfId) return setPostMsg("인플루언서를 선택해 주세요.");
    if (!postTitle.trim()) return setPostMsg("제목은 필수입니다.");

    const meta = { products: cleanedProducts };

    try {
      setPostSubmitting(true);
      const { data, error } = await supabasePublic
        .from("posts")
        .insert([
          {
            influencer_id: postInfId,
            title: postTitle.trim(),
            cover_image_url: postCover.trim() || null,
            body: postBody || null,
            meta,
            published: postPublished,
          },
        ])
        .select("id")
        .single();
      if (error) throw error;

      setCreatedPostId(data?.id ?? null);
      setPostMsg(`포스트 생성 성공! id=${data?.id ?? "?"}`);

      setPostTitle(""); setPostCover(""); setPostBody("");
      setPostPublished(true);
      setProducts([{ brand: "", name: "", link: "" }]);
    } catch (err: any) {
      setPostMsg(`실패: ${err?.message ?? String(err)}`);
    } finally {
      setPostSubmitting(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>새 글 / 인플루언서</h1>
        <div className={styles.toolbar}>
          <Link href="/admin" className={styles.btnGhost}>← Admin</Link>
        </div>
      </div>

      {/* 인플루언서 생성 */}
      <section className={styles.section}>
        <h2 style={{ margin: 0, fontSize: 16 }}>인플루언서 생성</h2>
        <form className={styles.form} onSubmit={handleCreateInfluencer}>
          <div className={styles.row}>
            <label className={styles.label}>slug*</label>
            <input
              className={styles.input}
              placeholder="예: teo"
              value={infSlug}
              onChange={(e) => setInfSlug(e.target.value)}
              required
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>name*</label>
            <input
              className={styles.input}
              placeholder="예: Teo"
              value={infName}
              onChange={(e) => setInfName(e.target.value)}
              required
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>bio</label>
            <textarea
              className={styles.textarea}
              placeholder="간단한 소개"
              value={infBio}
              onChange={(e) => setInfBio(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className={styles.btn} type="submit" disabled={infSubmitting}>
              {infSubmitting ? "생성 중…" : "인플루언서 생성"}
            </button>
            {infMsg && <span className={styles.help}>{infMsg}</span>}
          </div>
        </form>
      </section>

      {/* 포스트 생성 */}
      <section className={styles.section}>
        <h2 style={{ margin: 0, fontSize: 16 }}>포스트 생성</h2>
        <form className={styles.form} onSubmit={handleCreatePost}>
          <div className={styles.row}>
            <label className={styles.label}>influencer*</label>
            <select
              className={styles.select}
              value={postInfId}
              onChange={(e) => setPostInfId(e.target.value)}
              disabled={infLoading || !!infError}
              required
            >
              <option value="">{infLoading ? "불러오는 중…" : "선택하세요"}</option>
              {influencers.map((inf) => (
                <option key={inf.id} value={inf.id}>
                  {inf.slug ?? "(no-slug)"} — {inf.name ?? "(no-name)"}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.row}>
            <label className={styles.label}>title*</label>
            <input
              className={styles.input}
              placeholder="제목"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              required
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>cover_image_url</label>
            <input
              className={styles.input}
              placeholder="https://…"
              value={postCover}
              onChange={(e) => setPostCover(e.target.value)}
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>body</label>
            <textarea
              className={styles.textarea}
              placeholder="본문(선택)"
              value={postBody}
              onChange={(e) => setPostBody(e.target.value)}
            />
          </div>

          {/* 제품 입력 (brand / name / link) */}
          <div className={styles.row}>
            <label className={styles.label}>products</label>
            <div className={styles.products}>
              {products.map((p, i) => (
                <div key={i} className={`${styles.prodRow} ${styles.prodInputs}`}>
                  <input
                    className={styles.input}
                    placeholder="brand"
                    value={p.brand}
                    onChange={(e) => updateRow(i, "brand", e.target.value)}
                  />
                  <input
                    className={styles.input}
                    placeholder="name"
                    value={p.name}
                    onChange={(e) => updateRow(i, "name", e.target.value)}
                  />
                  <input
                    className={styles.input}
                    placeholder="link (https://…)"
                    value={p.link}
                    onChange={(e) => updateRow(i, "link", e.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.miniBtn}
                    onClick={() => removeRow(i)}
                    aria-label="행 삭제"
                  >
                    삭제
                  </button>
                </div>
              ))}
              <div>
                <button type="button" className={styles.miniBtn} onClick={addRow}>
                  + 행 추가
                </button>
              </div>
            </div>
          </div>

          <div className={styles.row}>
            <label className={styles.label}>published</label>
            <input
              type="checkbox"
              checked={postPublished}
              onChange={(e) => setPostPublished(e.target.checked)}
            />
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button className={styles.btn} type="submit" disabled={postSubmitting}>
              {postSubmitting ? "생성 중…" : "포스트 생성"}
            </button>
            {postMsg && <span className={styles.help}>{postMsg}</span>}
            {createdPostId && (
              <>
                <Link className={styles.linkBtn} href={`/post/${createdPostId}`}>
                  생성된 포스트 보기
                </Link>
                <Link className={styles.linkBtn} href="/admin">
                  Admin으로 가기
                </Link>
              </>
            )}
          </div>

          {/* 미리보기 (검증) */}
          <div className={styles.help}>
            meta 미리보기:&nbsp;
            <code style={{ fontSize: 12 }}>
              {JSON.stringify({ products: cleanedProducts })}
            </code>
          </div>
        </form>
      </section>
    </div>
  );
}
