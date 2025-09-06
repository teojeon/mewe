// src/app/onboarding/ui/OnboardingForm.tsx
"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

function normalizeHandle(input: string) {
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
  const safeBase = normalized.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
  return `${safeBase || "file"}.${safeExt || "dat"}`;
}

export default function OnboardingForm({ next }: { next: string }) {
  const supabase = createClientComponentClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const onPickCover = (f: File | null) => {
    setCoverFile(f);
    setCoverPreview(f ? URL.createObjectURL(f) : null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalName = name.trim();
    const finalSlug = normalizeHandle(slug);

    if (!finalName) return alert("이름을 입력해 주세요.");
    if (!finalSlug) return alert("인스타그램 핸들을 입력해 주세요.");
    if (!/^[A-Za-z0-9._]+$/.test(finalSlug)) {
      return alert("인스타그램 핸들은 영문/숫자/._ 만 사용할 수 있어요.");
    }
    if (!password.trim() || password.length < 8) return alert("비밀번호는 8자 이상 입력해 주세요.");
    if (password !== password2) return alert("비밀번호가 일치하지 않습니다.");

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("로그인이 필요합니다.");

      // 중복 슬러그 확인
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

      // 2) 커버 업로드 선택적
      if (coverFile) {
        const key = `influencers/${inf.id}/${Date.now()}-${sanitizeFileName(coverFile.name)}`;
        const { error: upErr } = await supabase.storage.from("covers").upload(key, coverFile, {
          cacheControl: "3600",
          upsert: true,
          contentType: coverFile.type || "image/jpeg",
        });
        if (upErr) throw upErr;
        const { data: pub } = await supabase.storage.from("covers").getPublicUrl(key);
        const url = pub?.publicUrl;
        if (!url) throw new Error("커버 퍼블릭 URL 생성 실패");

        try {
          const { error: e2a } = await supabase.from("influencers").update({ cover_image_url: url as any }).eq("id", inf.id);
          if (e2a) throw e2a;
        } catch (err: any) {
          if (String(err?.code) === "42703" || /column .* does not exist/i.test(String(err?.message))) {
            const { error: e2b } = await supabase.from("influencers").update({ avatar_url: url as any }).eq("id", inf.id);
            if (e2b) throw e2b;
          } else {
            throw err;
          }
        }
      }

      // 3) memberships 오너 등록
      const { error: e3 } = await supabase
        .from("memberships")
        .insert({ user_id: user.id, influencer_id: inf.id, role: "owner" });
      if (e3) throw e3;

      // 4) 현재 로그인 사용자에게 비밀번호 설정
      const { error: e4 } = await supabase.auth.updateUser({ password });
      if (e4) throw e4;

      // 완료 → /i/[slug]
      window.location.href = `/i/${inf.slug}`;
    } catch (err: any) {
      alert(err?.message || "온보딩 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={{ maxWidth: 520, margin: "48px auto", padding: 16 }}>
      <h1 style={{ fontWeight: 700, fontSize: 24, marginBottom: 16 }}>크리에이터 정보 설정</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>이름</span>
          <small style={{ color: "#888" }}>*이름은 메인페이지 상단에 노출됩니다.</small>
          <input
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder="예: 수지"
            style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>인스타그램</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.currentTarget.value)}
            placeholder="예: @name 이라면 name만 입력해주세요."
            style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            placeholder="8자 이상"
            style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8 }}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>비밀번호 확인</span>
          <input
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.currentTarget.value)}
            placeholder="다시 입력"
            style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8 }}
          />
        </label>

        <section style={{ display: "grid", gap: 8 }}>
          <span style={{ fontWeight: 600 }}>커버 이미지 (선택)</span>
          {coverPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverPreview} alt="preview" style={{ width: 240, height: 140, borderRadius: 12, objectFit: "cover", background: "#eee" }} />
          ) : (
            <div style={{ color: "#888", fontSize: 13 }}>선택된 이미지가 없습니다.</div>
          )}
          <input type="file" accept="image/*" onChange={(e) => onPickCover(e.currentTarget.files?.[0] ?? null)} />
        </section>

        <button className="tab-btn" type="submit" disabled={saving}>
          {saving ? "저장 중…" : "시작하기"}
        </button>
      </form>

      <p style={{ color: "#888", marginTop: 12, fontSize: 12 }}>완료 후 자동으로 내 페이지로 이동합니다.</p>
    </main>
  );
}
