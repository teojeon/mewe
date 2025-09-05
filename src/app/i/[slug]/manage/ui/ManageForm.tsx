// src/app/i/[slug]/manage/ui/ManageForm.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function ManageForm({
  influencerId,
  initialName,
  initialSlug,
}: {
  influencerId: string;
  initialName: string;
  initialSlug: string;
}) {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [saving, setSaving] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadHint, setUploadHint] = useState<string | null>(null);

  // 프로필 저장 (name/slug)
  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalName = name.trim();
    const finalSlug = normalizeHandle(slug);

    if (!finalName) return alert("이름을 입력해 주세요.");
    if (!finalSlug) return alert("인스타그램 핸들을 입력해 주세요.");
    if (!/^[a-z0-9._]+$/.test(finalSlug)) {
      return alert("인스타그램 핸들은 영문/숫자/._ 만 사용할 수 있어요.");
    }

    setSaving(true);
    try {
      // slug 중복 확인
      if (finalSlug !== initialSlug) {
        const { data: dup } = await supabase
          .from("influencers")
          .select("id")
          .eq("slug", finalSlug)
          .maybeSingle();
        if (dup?.id) throw new Error("이미 사용 중인 인스타그램 핸들이에요.");
      }

      // 업데이트
      const { error: e1 } = await supabase
        .from("influencers")
        .update({ name: finalName, slug: finalSlug })
        .eq("id", influencerId);

      if (e1) throw e1;

      // slug가 바뀌었으면 라우트도 새로고침 (새 slug 경로로)
      if (finalSlug !== initialSlug) {
        router.push(`/i/${finalSlug}/manage`);
      } else {
        router.refresh();
      }
      alert("저장되었습니다.");
    } catch (err: any) {
      alert(err?.message || "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  // cover 이미지 업로드
  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadHint(null);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const key = `covers/${influencerId}/${Date.now()}.${ext}`;

      // Storage 업로드
      const { error: upErr } = await supabase.storage.from("public").upload(key, file, {
        upsert: true,
        contentType: file.type || "image/jpeg",
      });
      if (upErr) throw upErr;

      // 퍼블릭 URL
      const { data: pub } = supabase.storage.from("public").getPublicUrl(key);
      const url = pub.publicUrl;

      // 우선 cover_image_url 컬럼에 저장 시도 → 없으면 avatar_url로 폴백
      try {
        const { error: e1 } = await supabase
          .from("influencers")
          .update({ cover_image_url: url as any })
          .eq("id", influencerId);
        if (e1) throw e1;
        setUploadHint("커버 이미지가 업데이트되었습니다.");
      } catch (err: any) {
        // 42703: column does not exist
        if (String(err?.code) === "42703" || /column .* does not exist/i.test(String(err?.message))) {
          const { error: e2 } = await supabase
            .from("influencers")
            .update({ avatar_url: url as any })
            .eq("id", influencerId);
          if (e2) throw e2;
          setUploadHint("커버 컬럼이 없어 프로필 이미지(avatar)로 저장했습니다.");
        } else {
          throw err;
        }
      }

      // 화면 갱신
      router.refresh();
    } catch (err: any) {
      alert(err?.message || "업로드 실패");
    } finally {
      setUploading(false);
      // 파일 입력 초기화
      e.currentTarget.value = "";
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <form onSubmit={saveProfile} style={{ display: "grid", gap: 12 }}>
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

        <div style={{ display: "flex", gap: 8 }}>
          <button className="tab-btn" type="submit" disabled={saving}>
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </form>

      <div style={{ height: 1, background: "#eee", margin: "8px 0" }} />

      <section style={{ display: "grid", gap: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>커버 이미지</h3>
        <p style={{ color: "#666", margin: 0, fontSize: 13 }}>
          인플루언서 상단 배경(또는 프로필 이미지로 대체)을 업로드할 수 있어요.
        </p>
        <label
          style={{
            border: "1px dashed #bbb",
            borderRadius: 12,
            padding: 16,
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            background: "#fafafa",
          }}
        >
          <input
            type="file"
            accept="image/*"
            onChange={onPickFile}
            style={{ display: "none" }}
          />
          <span style={{ color: "#444" }}>
            {uploading ? "업로드 중…" : "이미지 선택 또는 드래그 앤 드롭"}
          </span>
        </label>
        {uploadHint && <p style={{ color: "#118", margin: 0, fontSize: 12 }}>{uploadHint}</p>}
      </section>
    </div>
  );
}
