// src/app/admin/new/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabasePublic } from "@/lib/supabase-client";
import { compressImage } from "@/lib/image";
import styles from "@/styles/admin.module.css";

type Influencer = { id: string; name: string | null; slug: string | null };
type Product = { brand?: string; name?: string; link?: string };

export default function NewPostPage() {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [influencerId, setInfluencerId] = useState("");
  const [title, setTitle] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [body, setBody] = useState("");
  const [products, setProducts] = useState<Product[]>([{ brand: "", name: "", link: "" }]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabasePublic
        .from("influencers")
        .select("id,name,slug")
        .order("created_at", { ascending: false });
      if (!error && data) {
        setInfluencers(data as Influencer[]);
        if (data.length && !influencerId) setInfluencerId(data[0].id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateProduct = (idx: number, key: keyof Product, val: string) =>
    setProducts((prev) => prev.map((p, i) => (i === idx ? { ...p, [key]: val } : p)));
  const addProduct = () => setProducts((prev) => [...prev, { brand: "", name: "", link: "" }]);
  const removeProduct = (idx: number) => setProducts((prev) => prev.filter((_, i) => i !== idx));

  async function uploadCover(file: File, parentId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(
      `/api/upload?bucket=covers&prefix=posts/${encodeURIComponent(parentId)}/${today}`,
      { method: "POST", body: form }
    );
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || "커버 이미지 업로드 실패");
    // 🔒 Private: DB에는 path 저장
    return j.path as string;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!influencerId) return setMsg("인플루언서를 선택하세요.");
    if (!title.trim()) return setMsg("제목을 입력하세요.");

    setBusy(true);
    try {
      let coverPathToSave: string | null = null;
      if (coverFile) {
        const compressed = await compressImage(coverFile, { maxSize: 1600, quality: 0.85 });
        coverPathToSave = await uploadCover(compressed, influencerId);
      }

      const cleanProducts = products
        .map((p) => ({
          brand: p.brand?.trim() || undefined,
          name: p.name?.trim() || undefined,
          link: p.link?.trim() || undefined,
        }))
        .filter((p) => p.brand || p.name || p.link);

      const { error } = await supabasePublic.from("posts").insert({
        influencer_id: influencerId,
        title: title.trim(),
        cover_image_url: coverPathToSave, // ← path 저장
        body: body.trim() || null,
        meta: cleanProducts.length ? { products: cleanProducts } : null,
        published: true,
      });

      if (error) throw error;

      setMsg("게시글을 생성했습니다.");
      setTitle(""); setCoverFile(null); setBody("");
      setProducts([{ brand: "", name: "", link: "" }]);
    } catch (err: any) {
      setMsg(`실패: ${err.message ?? err}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>새글</h1>
        <div className={styles.actions}>
          <Link className={`${styles.btn} ${styles.btnGhost}`} href="/admin">← 돌아가기</Link>
        </div>
      </header>

      <form className={styles.form} onSubmit={onSubmit}>
        {!!msg && <div className={styles.alert}>{msg}</div>}

        <label className={styles.label}>
          <span>인플루언서 *</span>
          <select className={styles.select} value={influencerId} onChange={(e) => setInfluencerId(e.target.value)}>
            {influencers.map((inf) => (
              <option key={inf.id} value={inf.id}>
                {inf.name ?? "(이름 없음)"} {inf.slug ? `(@${inf.slug})` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.label}>
          <span>제목 *</span>
          <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="포스트 제목" required />
        </label>

        <label className={styles.label}>
          <span>커버 이미지</span>
          <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} className={styles.input} />
          {coverFile && (
            <div style={{ marginTop: 8 }}>
              <img src={URL.createObjectURL(coverFile)} alt="cover preview" style={{ width: 160, height: 160, objectFit: "cover", borderRadius: 12 }} />
              <div className={styles.help} style={{ marginTop: 6 }}>{coverFile.name}</div>
            </div>
          )}
          <small className={styles.help}>정사각형 권장(jpg/png/webp)</small>
        </label>

        <label className={styles.label}>
          <span>본문</span>
          <textarea className={styles.textarea} value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="내용을 입력하세요" />
        </label>

        <div className={styles.fieldset}>
          <div className={styles.fieldsetTitle}>착용 제품</div>
          {products.map((p, i) => (
            <div key={i} className={styles.grid3}>
              <input className={styles.input} placeholder="브랜드" value={p.brand ?? ""} onChange={(e) => updateProduct(i, "brand", e.target.value)} />
              <input className={styles.input} placeholder="상품명" value={p.name ?? ""} onChange={(e) => updateProduct(i, "name", e.target.value)} />
              <input className={styles.input} placeholder="링크(선택)" value={p.link ?? ""} onChange={(e) => updateProduct(i, "link", e.target.value)} />
              <div className={styles.rowRight}>
                <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => removeProduct(i)}>삭제</button>
              </div>
            </div>
          ))}
          <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={addProduct}>+ 제품 추가</button>
        </div>

        <div className={styles.footer}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy}>
            {busy ? "저장 중..." : "게시글 생성"}
          </button>
        </div>
      </form>
    </main>
  );
}
