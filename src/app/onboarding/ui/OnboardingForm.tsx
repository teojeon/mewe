// src/app/onboarding/ui/OnboardingForm.tsx
"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

function normalizeInstaHandle(input: string) {
  let v = input.trim();
  v = v.replace(/^@/, "");
  v = v.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "");
  v = v.replace(/^instagram\.com\//i, "");
  v = v.replace(/[/?#].*$/, "");
  v = v.replace(/\s+/g, "");
  return v.toLowerCase();
}

function sanitizeFileName(name: string) {
  const parts = name.split(".");
  const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : "";
  const base = parts.join(".");
  const normalized = base.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const safeBase = normalized
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
  return `${safeBase || "file"}.${safeExt || "dat"}`;
}

export default function OnboardingForm({ next }: { next: string }) {
  const supabase = createClientComponentClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  // 커버 이미지 상태
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const onPickCover = (file: File | null) => {
    setCoverFile(file);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalName = name.trim();
    const finalSlug = normalizeInstaHandle(slug);

    if (!finalName) return alert("이름을 입력해 주세요.");
    if (!finalSlug) return alert("인스타그램 핸들을 입력해 주세요.");
    if (!/^[A-Za-z0-9._]+$/.test(finalSlug)) {
      return alert("인스타그램 핸들은 영문/숫자/._ 만 사용할 수 있어요.");
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("로그인이 필요합니다.");

      // 0) slug 중복 확인
      const { data: dup } = await supabase
        .from("influencers")
        .select("id")
        .eq("slug", finalSlug)
        .maybeSingle();
      if (dup?.id) throw new Error("이미 사용 중인 인스타그램 핸들이에요.");

      // 1) influencers 생성
      const { data: inf, error: e1 } = await supabase
        .from("influencers")
        .insert({ name: finalName, slug: finalSlug })
        .select("id, slug")
        .maybeSingle();
      if (e1 || !inf?.id) throw e1 || new Error("influencer 생성 실패");

      // 2) (선택) 커버 파일 업로드 → cover_image_url 저장
      if (coverFile) {
        const key = `influencers/${inf.id}/${Date.now()}-${sanitizeFileName(coverFile.name)}`;
        const { error: upErr } = await supabase.storage
          .from("covers")
          .upload(key, coverFile, {
            cacheControl: "3600",
            upsert: true,
            contentType: coverFile.type || "image/jpeg",
          });
        if (upErr) throw upErr;

        const { data: pub } = await supabase.storage.from("covers").getPublicUrl(key);
        const url = pub?.publicUrl;
        if (!url) throw new Error("커버 이미지 퍼블릭 URL 생성 실패");

        // cover_image_url 컬럼에 저장 (없으면 avatar_url로 폴백)
        try {
          const { error: upInfErr } = await supabase
            .from("influencers")
            .update({ cover_image_url: url as any })
            .eq("id", inf.id);
          if (upInfErr) throw upInfErr;
        } catch (err: any) {
          if (String(err?.code) === "42703" || /column .* does not exist/i.test(String(err?.message))) {
            const { error: upAltErr } = await supabase
              .from("influencers")
              .update({ avatar_url: url as any })
              .eq("id", inf.id);
            if (upAltErr) throw upAltErr;
          } else {
            throw err;
          }
        }
      }

      // 3) memberships 오너 등록
      const { error: e2 } = await supabase
        .from("memberships")
        .insert({ user_id: user.id, influencer_id: inf.id, role: "owner" });
      if (e2) throw e2;

      // 완료 → 내 페이지로 이동
      window.location.href = `/i/${inf.slug}`;
    } catch (err: any) {
      alert(err?.message || "온보딩 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={{ maxWidth: 480, margin: "48px auto", padding: 16 }}>
      <h1 style={{ fontWeight: 700, fontSize: 24, marginBottom: 16 }}>
        크리에이터 정보 설정
      </h1>

      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        {/* 이름 */}
        <label style={{ display: "grid", gap: 6 }}>
          <span>이름</span>
          <small style={{ color: "#888" }}>*이름은 메인페이지 상단에 노출됩니다.</small>
          <input
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder="예: 수지"
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #ddd",
              borderRadius: 8,
            }}
          />
        </label>

        {/* 인스타그램(슬러그) */}
        <label style={{ display: "grid", gap: 6 }}>
          <span>인스타그램</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.currentTarget.value)}
            placeholder="예: @name 이라면 name만 입력해주세요."
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #ddd",
              borderRadius: 8,
            }}
          />
        </label>

        {/* 커버 이미지 업로드 */}
        <section style={{ display: "grid", gap: 8, marginTop: 4 }}>
          <span style={{ fontWeight: 600 }}>커버 이미지</span>
          {coverPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverPreview}
              alt="cover preview"
              style={{ width: 200, height: 120, borderRadius: 12, objectFit: "cover", background: "#eee" }}
            />
          ) : (
            <div style={{ color: "#888", fontSize: 13 }}>선택된 이미지가 없습니다.</div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onPickCover(e.currentTarget.files?.[0] ?? null)}
            style={{}}
          />
        </section>

        <button className="tab-btn" type="submit" disabled={saving}>
          {saving ? "저장 중…" : "시작하기"}
        </button>
      </form>

      <p style={{ color: "#888", marginTop: 12, fontSize: 12 }}>
        완료 후 자동으로 내 페이지로 이동합니다.
      </p>
    </main>
  );
}
