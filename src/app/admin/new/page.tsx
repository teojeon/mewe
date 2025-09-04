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
        setInfError(null);
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

  // ✅ (1) state/핸들러 추가: 소개 링크 관리
  const [infLinks, setInfLinks] = useState<string[]>([""]);

  function addInfLink() {
    setInfLinks((prev) => [...prev, ""]);
  }
  function removeInfLink(idx: number) {
    setInfLinks((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateInfLink(idx: number, val: string) {
    setInfLinks((prev) => prev.map((v, i) => (i === idx ? val : v)));
  }

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

      // ✅ (2) DB insert에 links 포함
      const { data, error } = await supabasePublic
        .from("influencers")
        .insert([
          {
            slug: infSlug.trim(),
            name: infName.trim(),
            bio: infBio || null,
            links: infLinks
              .filter((x) => x.trim())
              .map((x) => ({ url: x.trim() })), // [{url}] 형태
          },
        ])
        .select("id")
        .single();

      if (error) throw error;
      setInfMsg(`인플루언서 생성 성공! id=${data?.id ?? "?"}`);

      // 생성 후 목록 리프레시
      const { data: refreshed, error: err2 } = await supabasePublic
        .from("influencers")
        .select("id,slug,name")
        .order("created_at", { ascending: false });
      if (!err2) setInfluencers((refreshed ?? []) as Influencer[]);

      // 폼 초기화
      setInfSlug("");
      setInfName("");
      setInfBio("");
      setInfLinks([""]);
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
  function updateRow(index: number, key: keyof ProductInput, val: string) {
    setProducts((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [key]: val } : p))
    );
  }

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    setPostMsg(null);
    if (!postInfId) return setPostMsg("인플루언서를 선택해 주세요.");
    if (!postTitle.trim()) return setPostMsg("제목은 필수입니다.");

    const cleanedProducts = products
      .map((p) => ({
        brand: p.brand?.trim(),
        name: p.name?.trim(),
        link: p.link?.trim(),
      }))
      .filter((p) => p.brand || p.name || p.link);

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
      setPostMsg("게시글 생성 완료!");
      setPostTitle("");
      setPostCover("");
      setPostBody("");
      setProducts([{ brand: "", name: "", link: "" }]);
    } catch (err: any) {
      setPostMsg(`실패: ${err?.message ?? String(err)}`);
    } finally {
      setPostSubmitting(false);
    }
  }

  const cleanedProductsPreview = useMemo(
    () =>
      products
        .map((p) => ({
          brand: p.brand?.trim(),
          name: p.name?.trim(),
          link: p.link?.trim(),
        }))
        .filter((p) => p.brand || p.name || p.link),
    [products]
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>새 글 / 인플루언서</h1>
        <div className={styles.toolbar}>
          <Link href="/admin" className={styles.btnGhost}>
            ← Admin
          </Link>
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
              placeholder="meetquack"
              value={infSlug}
              onChange={(e) => setInfSlug(e.target.value)}
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>name*</label>
            <input
              className={styles.input}
              placeholder="Meetquack"
              value={infName}
              onChange={(e) => setInfName(e.target.value)}
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

          {/* ✅ (3) bio 아래 링크 입력 UI 블록 */}
          <div className={styles.row}>
            <label className={styles.label}>소개 링크</label>
            <div className={styles.products}>
              {infLinks.map((v, i) => (
                <div key={i} className={`${styles.prodRow} ${styles.prodInputs}`}>
                  <input
                    className={styles.input}
                    placeholder="https://…"
                    value={v}
                    onChange={(e) => updateInfLink(i, e.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.miniBtn}
                    onClick={() => removeInfLink(i)}
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={addInfLink}
              >
                + 링크 추가
              </button>
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.btnPrimary} disabled={infSubmitting}>
              {infSubmitting ? "생성 중…" : "인플루언서 생성"}
            </button>
            {infMsg && <div className={styles.help}>{infMsg}</div>}
            {infError && <div className={styles.help} style={{ color: "tomato" }}>{infError}</div>}
          </div>
        </form>
      </section>

      {/* 게시글 생성 */}
      <section className={styles.section}>
        <h2 style={{ margin: 0, fontSize: 16 }}>게시글 생성</h2>
        <form className={styles.form} onSubmit={handleCreatePost}>
          <div className={styles.row}>
            <label className={styles.label}>influencer*</label>
            <select
              className={styles.input}
              value={postInfId}
              onChange={(e) => setPostInfId(e.target.value)}
            >
              <option value="">-- 선택 --</option>
              {influencers.map((inf) => (
                <option key={inf.id} value={inf.id}>
                  {inf.name ?? inf.slug ?? inf.id}
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
            <label className={styles.label}>본문</label>
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
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.btnGhost} onClick={addRow}>
                + 행 추가
              </button>
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

          <div className={styles.actions}>
            <button className={styles.btnPrimary} disabled={postSubmitting}>
              {postSubmitting ? "생성 중…" : "게시글 생성"}
            </button>
            {postMsg && <div className={styles.help}>{postMsg}</div>}
            {createdPostId && (
              <div className={styles.help}>
                새 글: <Link href={`/post/${createdPostId}`}>/post/{createdPostId}</Link>
              </div>
            )}
          </div>

          {/* 미리보기 (검증) */}
          <div className={styles.help}>
            meta 미리보기:&nbsp;
            <code style={{ fontSize: 12 }}>
              {JSON.stringify({ products: cleanedProductsPreview })}
            </code>
          </div>
        </form>
      </section>
    </div>
  );
}
