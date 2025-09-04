// src/app/admin/new-influencer/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { compressImage } from "@/lib/image";
import styles from "@/styles/admin.module.css";

type LinkRow = { url: string; label?: string };

export default function NewInfluencerPage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [bio, setBio] = useState("");
  const [links, setLinks] = useState<LinkRow[]>([{ url: "" }]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const addLink = () => setLinks((prev) => [...prev, { url: "" }]);
  const removeLink = (idx: number) => setLinks((prev) => prev.filter((_, i) => i !== idx));
  const updateLink = (idx: number, key: keyof LinkRow, val: string) =>
    setLinks((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: val } : r)));

  async function uploadAvatar(file: File, slugValue: string) {
    const today = new Date().toISOString().slice(0, 10);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(
      `/api/upload?bucket=avatars&prefix=influencers/${encodeURIComponent(slugValue)}/${today}`,
      { method: "POST", body: form }
    );
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || "아바타 업로드 실패");
    // Private 버킷: DB에는 path 저장
    return j.path as string;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    const n = name.trim();
    const s = slug.trim();
    const b = bio.trim();
    if (!n || !s) {
      setMsg("이름과 슬러그는 필수입니다.");
      return;
    }

    setBusy(true);
    try {
      // 1) 이미지 압축 → 업로드
      let avatarPathToSave: string | null = null;
      if (avatarFile) {
        const compressed = await compressImage(avatarFile, { maxSize: 1600, quality: 0.85 });
        avatarPathToSave = await uploadAvatar(compressed, s);
      }

      // 2) 서버 라우트에 INSERT (Service Role)
      const cleanLinks = links
        .map((l) => ({ url: l.url.trim(), label: l.label?.trim() || undefined }))
        .filter((l) => l.url);

      const res = await fetch("/api/admin/influencers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: n,
          slug: s,
          bio: b || null,
          avatar_path: avatarPathToSave,
          links: cleanLinks,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "서버 저장 실패");

      setMsg("인플루언서를 생성했습니다.");
      setName(""); setSlug(""); setBio("");
      setLinks([{ url: "" }]); setAvatarFile(null);
    } catch (err: any) {
      setMsg(`실패: ${err.message ?? err}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>신규 인플루언서</h1>
        <div className={styles.actions}>
          <Link className={`${styles.btn} ${styles.btnGhost}`} href="/admin">
            ← 돌아가기
          </Link>
        </div>
      </header>

      <form className={styles.form} onSubmit={onSubmit}>
        {!!msg && <div className={styles.alert}>{msg}</div>}

        <label className={styles.label}>
          <span>이름 *</span>
          <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="예: Suzzy" required />
        </label>

        <label className={styles.label}>
          <span>슬러그 *</span>
          <input className={styles.input} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="예: suzzy_01" required />
          <small className={styles.help}>/i/&lt;slug&gt; 경로에 사용됩니다.</small>
        </label>

        <label className={styles.label}>
          <span>아바타 이미지</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
            className={styles.input}
          />
          {avatarFile && (
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <img
                src={URL.createObjectURL(avatarFile)}
                alt="avatar preview"
                style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }}
              />
              <small className={styles.help}>{avatarFile.name}</small>
            </div>
          )}
          <small className={styles.help}>정사각형 권장(jpg/png/webp)</small>
        </label>

        <label className={styles.label}>
          <span>소개 (bio)</span>
          <textarea
            className={styles.textarea}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="간단한 소개를 입력하세요"
            rows={4}
          />
        </label>

        <div className={styles.fieldset}>
          <div className={styles.fieldsetTitle}>소개 링크</div>
          <div className={styles.linksStack}>
            {links.map((row, i) => (
              <div key={i} className={styles.linkRow}>
                <input
                  className={styles.input}
                  placeholder="https://instagram.com/..."
                  value={row.url}
                  onChange={(e) => updateLink(i, "url", e.target.value)}
                />
                <input
                  className={styles.input}
                  placeholder="라벨(선택): Instagram"
                  value={row.label ?? ""}
                  onChange={(e) => updateLink(i, "label", e.target.value)}
                />
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={() => removeLink(i)}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={addLink}
          >
            + 링크 추가
          </button>
        </div>

        <div className={styles.footer}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy}>
            {busy ? "저장 중..." : "인플루언서 생성"}
          </button>
        </div>
      </form>
    </main>
  );
}
