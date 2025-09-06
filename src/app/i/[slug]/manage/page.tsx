// src/app/i/[slug]/manage/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import styles from "@/styles/admin.module.css";
import LogoutButton from "@/components/LogoutButton";

// ---------- Types ----------
type PostCard = {
  id: string;
  cover_image_url: string | null;
  title: string | null;
  published: boolean | null;
};

type LinkRow = { text: string; url: string };
type EditProduct = { id?: string; brand: string; name: string; url: string; keep?: boolean };
type NewProduct = { brand: string; name: string; url: string };

// ---------- Utils ----------
function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80);
}

/** 인스타그램 입력을 slug로 정규화: @name, URL, 공백 등 허용 → name만 추출 */
function normalizeInstagramHandleToSlug(raw: string): string {
  let s = (raw || "").trim();
  if (!s) return "";
  try {
    // URL이면 path에서 마지막 세그먼트
    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s);
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length > 0) s = parts[parts.length - 1];
    }
  } catch {
    // 무시
  }
  // @ 제거
  if (s.startsWith("@")) s = s.slice(1);
  // 허용 문자만
  s = s.replace(/[^a-zA-Z0-9._]/g, "");
  return s.toLowerCase();
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
const makeCoverPath = (fileName: string) => `covers/${Date.now()}-${sanitizeFileName(fileName)}`;

export default function ManagePage() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const params = useParams<{ slug: string }>();
  const router = useRouter();

  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [linkRows, setLinkRows] = useState<LinkRow[]>([]);

  // influencer 기본 정보
  const [influencerId, setInfluencerId] = useState<string>("");
  const [profileName, setProfileName] = useState<string>("");
  const [profileSlug, setProfileSlug] = useState<string>("");
  const [profileCoverPreview, setProfileCoverPreview] = useState<string | null>(null);
  const [igUsername, setIgUsername] = useState<string | null>(null);
  const [igVerifiedAt, setIgVerifiedAt] = useState<string | null>(null);

  // 커버 업로드(프로필 카드)
  const [profileUploading, setProfileUploading] = useState(false);
  const [profileUploadHint, setProfileUploadHint] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0); // input 재마운트용

  // 포스트 목록
  const [posts, setPosts] = useState<PostCard[]>([]);
  // ✅ 링크 편집용 상태
// 상단 state 영역

// 초기 로딩에서 불러온 links를 state로 넣기 (useEffect 내부에서 inf 읽은 직후에 추가)


// 링크 행 조작 헬퍼
const addLinkRow = () => setLinkRows((prev) => [...prev, { text: "", url: "" }]);
const removeLinkRow = (idx: number) => setLinkRows((prev) => prev.filter((_, i) => i !== idx));
const changeLinkRow = (idx: number, key: keyof LinkRow, value: string) =>
  setLinkRows((prev) => prev.map((v, i) => (i === idx ? { ...v, [key]: value } : v)));

  
  // 편집 모달(기존 포스트 편집)
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editPostId, setEditPostId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editPublished, setEditPublished] = useState(false);
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null);
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [editClearCover, setEditClearCover] = useState(false);

  const [origProductIds, setOrigProductIds] = useState<string[]>([]);
  const [editProducts, setEditProducts] = useState<EditProduct[]>([]);
  const [newProducts, setNewProducts] = useState<NewProduct[]>([{ brand: "", name: "", url: "" }]);

  // ---------- Effects: 초기 로딩 ----------
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setMsg("");
      try {
        // 1) 현재 슬러그의 influencer 찾기
        const { data: inf, error: e1 } = await supabase
          .from("influencers")
          .select("id, name, slug, avatar_url, cover_image_url, instagram_username, instagram_verified_at, links")
          .eq("slug", params.slug)
          .maybeSingle();
        if (e1) throw e1;
        if (!inf) throw new Error("인플루언서를 찾을 수 없습니다.");

        const infId = String(inf.id);
        setInfluencerId(infId);
        setProfileName(inf?.name ?? "");
        setProfileSlug(inf?.slug ?? "");
        setProfileCoverPreview(
          typeof inf?.cover_image_url === "string"
            ? inf.cover_image_url
            : typeof inf?.avatar_url === "string"
            ? inf.avatar_url
            : null
        );
        setIgUsername(typeof inf?.instagram_username === "string" ? inf.instagram_username : null);
        setIgVerifiedAt(inf?.instagram_verified_at ?? null);
// inf를 성공적으로 불러온 뒤(권한 체크 전/후 아무 곳 OK, 단 inf가 존재하는 구간)
const rawLinks = Array.isArray((inf as any)?.links) ? (inf as any).links : [];
const initLinks: LinkRow[] = rawLinks
  .filter((r: any) => r && typeof r === "object")
  .map((r: any) => ({
    text: typeof r.text === "string" ? r.text : "",
    url: typeof r.url === "string" ? r.url : "",
  }));
setLinkRows(initLinks);

        // 2) 권한(owner/editor) 확인
        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id;
        
        // 관리자 플래그 조회(본인 행만 읽기 허용 정책이 있으므로 안전)
const { data: adminRow } = await supabase
  .from('app_admins')
  .select('user_id')
  .eq('user_id', uid)
  .maybeSingle();
const isAdmin = !!adminRow;

if (!isAdmin) {
  const { data: mem, error: e2 } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', uid)
    .eq('influencer_id', infId)
    .in('role', ['owner', 'editor'])
    .maybeSingle();
  if (e2 || !mem) throw new Error('권한이 없습니다.');
}
// isAdmin이면 통과
        if (!uid) throw new Error("로그인이 필요합니다.");
        const { data: mem, error: e2 } = await supabase
          .from("memberships")
          .select("role")
          .eq("user_id", uid)
          .eq("influencer_id", infId)
          .in("role", ["owner", "editor"])
          .maybeSingle();
        if (e2 || !mem) throw new Error("권한이 없습니다.");

        // 3) 포스트 목록
        const { data: rows, error: e3 } = await supabase
          .from("posts")
          .select("id, title, published, cover_image_url, author_influencer_id")
          .eq("author_influencer_id", infId)
          .order("created_at", { ascending: false });
        if (e3) throw e3;

        setPosts(
          (rows ?? []).map((r: any) => ({
            id: String(r.id),
            title: r?.title ?? null,
            published: !!r?.published,
            cover_image_url: typeof r?.cover_image_url === "string" ? r.cover_image_url : null,
          }))
        );
      } catch (e: any) {
        setMsg(`불러오기 실패: ${e?.message ?? e}`);
      } finally {
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug]);

  // ---------- Profile Cover Upload ----------
  // ✅ 프로필 이미지(avatar_url) 업로드로 변경
const onPickProfileCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.currentTarget.files?.[0];
  if (!file) return;

  setProfileUploading(true);
  setProfileUploadHint(null);
  try {
    const key = makeCoverPath(file.name);
    const { error: upErr } = await supabase.storage.from("covers").upload(key, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || "application/octet-stream",
    });
    if (upErr) throw upErr;

    const { data: pub } = await supabase.storage.from("covers").getPublicUrl(key);
    const url = pub?.publicUrl;
    if (!url) throw new Error("퍼블릭 URL 생성 실패");

    // ✅ avatar_url 로만 저장 (이전 cover_image_url 시도 제거)
    const { error: e1 } = await supabase
      .from("influencers")
      .update({ avatar_url: url as any })
      .eq("id", influencerId);
    if (e1) throw e1;

    setProfileUploadHint("프로필 이미지가 업데이트되었습니다.");
    setProfileCoverPreview(url);
    router.refresh();
  } catch (err: any) {
    setMsg(`프로필 이미지 업로드 실패: ${err?.message ?? err}`);
  } finally {
    setProfileUploading(false);
    setFileInputKey((k) => k + 1); // input 재마운트로 값 초기화
  }
};


  // ---------- Profile Save (name / slug) ----------
  const onSaveProfile = async () => {
    setMsg("");
    try {
      const name = (profileName || "").trim();
      const slugRaw = (profileSlug || "").trim();
      if (!name) throw new Error("이름을 입력해 주세요.");
      if (!slugRaw) throw new Error("인스타그램 핸들을 입력해 주세요.");

      const normalizedSlug = normalizeInstagramHandleToSlug(slugRaw);
      if (!normalizedSlug) throw new Error("유효한 인스타그램 핸들이 아닙니다.");

      // slug 중복 체크
      const { data: exists } = await supabase
        .from("influencers")
        .select("id")
        .eq("slug", normalizedSlug)
        .limit(1);
      if (Array.isArray(exists) && exists.length > 0 && String(exists[0].id) !== influencerId) {
        throw new Error("이미 사용 중인 인스타그램 핸들입니다.");
      }

      // 업데이트
      const { error: upErr } = await supabase
        .from("influencers")
        .update({ name, slug: normalizedSlug })
        .eq("id", influencerId);
      if (upErr) throw upErr;

      // 상태 갱신
      setProfileSlug(normalizedSlug);
      setMsg("프로필이 저장되었습니다.");
      if (normalizedSlug !== params.slug) {
        // URL 슬러그가 바뀐 경우, 새 경로로 이동
        router.replace(`/i/${normalizedSlug}/manage`);
      } else {
        router.refresh();
      }
    } catch (e: any) {
      setMsg(`저장 실패: ${e?.message ?? e}`);
    }
  };

  // ---------- Post Edit helpers ----------
  const onEditCoverChange = (file: File | null) => {
    setEditCoverFile(file);
    setEditCoverPreview(file ? URL.createObjectURL(file) : null);
  };
  const addNewProductRow = () => setNewProducts((prev) => [...prev, { brand: "", name: "", url: "" }]);
  const removeNewProductRow = (idx: number) => setNewProducts((prev) => prev.filter((_, i) => i !== idx));
  const changeNewProduct = (idx: number, key: keyof NewProduct, value: string) =>
    setNewProducts((prev) => prev.map((v, i) => (i === idx ? { ...v, [key]: value } : v)));
  const changeEditProduct = (idx: number, key: keyof EditProduct, value: string) =>
    setEditProducts((prev) => prev.map((v, i) => (i === idx ? { ...v, [key]: value } : v)));
  const toggleKeepEditProduct = (idx: number) =>
    setEditProducts((prev) => prev.map((v, i) => (i === idx ? { ...v, keep: !v.keep } : v)));

  const openEdit = async (postId: string) => {
    setMsg("");
    setEditOpen(true);
    setEditLoading(true);
    setEditPostId(postId);
    setEditTitle("");
    setEditPublished(false);
    setEditCoverPreview(null);
    setEditCoverFile(null);
    setEditClearCover(false);
    setEditProducts([]);
    setNewProducts([{ brand: "", name: "", url: "" }]);
    setOrigProductIds([]);

    try {
      const { data: p, error: e1 } = await supabase.from("posts").select("id, title, published, cover_image_url").eq("id", postId).maybeSingle();
      if (e1) throw e1;
      if (!p) throw new Error("포스트가 없습니다.");

      setEditTitle(p?.title ?? "");
      setEditPublished(!!p?.published);
      setEditCoverPreview(typeof p?.cover_image_url === "string" ? p.cover_image_url : null);

      const { data: rel, error: e2 } = await supabase
        .from("posts_products")
        .select("product_id, products ( id, brand, name, url )")
        .eq("post_id", postId);
      if (e2) throw e2;

      const exist: EditProduct[] = (rel ?? [])
        .map((row: any) => row?.products ?? null)
        .filter(Boolean)
        .map((prod: any) => ({
          id: String(prod.id),
          brand: typeof prod?.brand === "string" ? prod.brand : "",
          name: typeof prod?.name === "string" ? prod.name : "",
          url: typeof prod?.url === "string" ? prod.url : "",
          keep: true,
        }));
      setEditProducts(exist);
      setOrigProductIds(exist.map((p) => p.id!).filter(Boolean) as string[]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      setMsg(`편집 데이터 로드 실패: ${e?.message ?? e}`);
    } finally {
      setEditLoading(false);
    }
  };

  const saveEdit = async () => {
    setMsg("");
    try {
      if (!editPostId) return;

      // 커버 처리
      let cover_image_url: string | undefined;
      if (editClearCover) {
        // null 저장 허용 스키마만
        // @ts-ignore
        cover_image_url = null;
      } else if (editCoverFile) {
        const key = makeCoverPath(editCoverFile.name);
        const { error: upErr } = await supabase.storage.from("covers").upload(key, editCoverFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: editCoverFile.type || "application/octet-stream",
        });
        if (upErr) throw upErr;
        const { data: pub } = await supabase.storage.from("covers").getPublicUrl(key);
        cover_image_url = pub?.publicUrl ?? null;
      }

      // posts
      const updateData: any = { title: editTitle.trim(), published: editPublished };
      if (cover_image_url !== undefined) updateData.cover_image_url = cover_image_url;
      const { error: upPostErr } = await supabase.from("posts").update(updateData).eq("id", editPostId);
      if (upPostErr) throw upPostErr;

      // 제품: 삭제
      const keepIds = editProducts.filter((p) => p.keep && p.id).map((p) => p.id!) as string[];
      const removeIds = origProductIds.filter((id) => !keepIds.includes(id));
      if (removeIds.length > 0) {
        const { error: delRelErr } = await supabase.from("posts_products").delete().eq("post_id", editPostId).in("product_id", removeIds);
        if (delRelErr) throw delRelErr;
      }
      // 제품: 수정
      const toUpdate = editProducts
        .filter((p) => p.keep && p.id)
        .map((p) => ({ id: p.id, brand: (p.brand ?? "").trim(), name: (p.name ?? "").trim(), url: (p.url ?? "").trim() }));
      if (toUpdate.length > 0) {
        const { error: upProdErr } = await supabase.from("products").upsert(toUpdate, { onConflict: "id" });
        if (upProdErr) throw upProdErr;
      }
      // 제품: 새로 추가
      const toCreate = newProducts
        .map((p) => ({ brand: (p.brand ?? "").trim(), name: (p.name ?? "").trim(), url: (p.url ?? "").trim() }))
        .filter((p) => p.brand || p.name || p.url)
        .map((p) => {
  const base = [p.brand, p.name].filter((s) => !!(s || "").trim()).join(" ").trim() || (p.url || "").trim() || Math.random().toString(36).slice(2);
  return { ...p, slug: slugify(base) };
});
      if (toCreate.length > 0) {
        const { data: created, error: cErr } = await supabase.from("products").upsert(toCreate, { onConflict: "slug" }).select("id");
        if (cErr) throw cErr;
        const newIds = (created ?? []).map((r: any) => String(r.id));
        if (newIds.length > 0) {
          const relRows = newIds.map((pid) => ({ post_id: editPostId, product_id: pid }));
          const { error: linkErr } = await supabase.from("posts_products").insert(relRows);
          if (linkErr) throw linkErr;
        }
      }

      // 목록 새로고침
      const { data: rows } = await supabase
        .from("posts")
        .select("id, title, published, cover_image_url")
        .eq("author_influencer_id", influencerId)
        .order("created_at", { ascending: false });
      setPosts(
        (rows ?? []).map((r: any) => ({
          id: String(r.id),
          title: r?.title ?? null,
          published: !!r?.published,
          cover_image_url: typeof r?.cover_image_url === "string" ? r.cover_image_url : null,
        }))
      );

      setEditOpen(false);
      setMsg("저장되었습니다.");
    } catch (e: any) {
      setMsg(`저장 실패: ${e?.message ?? e}`);
    }
  };

  // ---------- Render ----------
  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>관리: {params.slug}</h1>
        <div className={styles.actions} style={{ display: "flex", gap: 8 }}>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => router.push(`/i/${params.slug}`)}>
            프로필 보기
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => router.refresh()}>
            새로고침
          </button>
          <LogoutButton className={`${styles.btn} ${styles.btnSecondary}`} label="로그아웃" />
        </div>
      </header>

      {msg && <div className={styles.alert}>{msg}</div>}

      {/* ===== 프로필 카드(이름/슬러그/커버) + 인스타그램 인증 ===== */}
      <section className={styles.fieldset} style={{ marginBottom: 18 }}>
        <div className={styles.fieldsetTitle}>프로필 정보</div>
        <div className={styles.form}>
          <label className={styles.label}>
            이름
            <small style={{ display: "block", color: "#888", marginTop: 4 }}>*이름은 메인페이지 상단에 노출됩니다.</small>
            <input className={styles.input} value={profileName} onChange={(e) => setProfileName(e.target.value)} />
          </label>

          <label className={styles.label}>
            인스타그램
            <input
              className={styles.input}
              value={profileSlug}
              onChange={(e) => setProfileSlug(e.target.value)}
              placeholder="예: @name 이라면 name만 입력해주세요."
            />
            <div className={styles.hint}>
              입력 예시: <code>@mewe</code>, <code>https://instagram.com/mewe</code>, <code>mewe</code> → <b>mewe</b> 로 저장
            </div>
          </label>

          <div className={styles.label}>
            <div className={styles.fieldsetTitle}>프로필 이미지</div>
            {profileCoverPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileCoverPreview}
                alt="profile"
                style={{ width: 200, height: 200, borderRadius: 12, objectFit: "cover", background: "#eee" }}
              />
            ) : (
              <div className={styles.hint}>현재 프로필 이미지 없음</div>
            )}
            <input
              key={fileInputKey}
              className={styles.input}
              type="file"
              accept="image/*"
              onChange={onPickProfileCover}
              disabled={profileUploading}
            />
            {profileUploadHint && <div className={styles.hint}>{profileUploadHint}</div>}
          </div>

          <div className={styles.rowRight}>
            <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onSaveProfile}>
              프로필 저장
            </button>
          </div>
        </div>
      </section>
<section className={styles.fieldset} style={{ marginBottom: 18 }}>
  <div className={styles.fieldsetTitle}>링크 관리</div>
  <div className={styles.form}>
    <div className={styles.linksStack}>
      {linkRows.length === 0 && <div className={styles.hint}>등록된 링크가 없습니다. 아래 ‘+ 링크 추가’로 추가해 주세요.</div>}

      {linkRows.map((row, i) => (
        <div key={i} className={styles.linkRow} style={{ gridTemplateColumns: "1fr 2fr auto" }}>
          <input
            className={styles.input}
            placeholder="표시 텍스트 (선택)"
            value={row.text}
            onChange={(e) => changeLinkRow(i, "text", e.target.value)}
          />
          <input
            className={styles.input}
            placeholder="링크(URL) *"
            value={row.url}
            onChange={(e) => changeLinkRow(i, "url", e.target.value)}
          />
          <div className={styles.rowRight}>
            <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => removeLinkRow(i)}>
              삭제
            </button>
          </div>
        </div>
      ))}
    </div>

    <div className={styles.rowRight} style={{ marginTop: 8, gap: 8 }}>
      <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={addLinkRow}>
        + 링크 추가
      </button>
      <button
        type="button"
        className={`${styles.btn} ${styles.btnPrimary}`}
        onClick={async () => {
          setMsg("");
          try {
            // url이 비어있는 항목 제거, text는 빈 값 허용
            const cleaned = linkRows
              .map((r) => ({ text: (r.text || "").trim(), url: (r.url || "").trim() }))
              .filter((r) => r.url.length > 0);

            const { error: upErr } = await supabase
              .from("influencers")
              .update({ links: cleaned as any })
              .eq("id", influencerId);
            if (upErr) throw upErr;

            setMsg("링크가 저장되었습니다.");
            router.refresh();
          } catch (e: any) {
            setMsg(`링크 저장 실패: ${e?.message ?? e}`);
          }
        }}
      >
        링크 저장
      </button>
    </div>

    <div className={styles.hint} style={{ marginTop: 6 }}>
      * URL이 비어 있는 항목은 저장 시 자동으로 제외됩니다.
    </div>
  </div>
</section>

      {/* ===== 인스타그램 인증 (관리자 수동 토글 읽기 전용 표시) ===== */}
<section className={styles.fieldset} style={{ marginBottom: 24 }}>
  <div className={styles.fieldsetTitle}>인증 상태</div>
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: 12,
      border: "1px solid rgba(0,0,0,0.08)",
      borderRadius: 12,
      background: "#fff",
    }}
  >
    <span>현재 상태:&nbsp;</span>
    {igVerifiedAt ? (
      <b style={{ color: "green" }}>인증</b>
    ) : (
      <b style={{ color: "#b00" }}>미인증</b>
    )}
    <span style={{ color: "#666" }}>
      {igVerifiedAt ? ` (${new Date(igVerifiedAt).toLocaleString()})` : ""}
    </span>

    {/* 인플루언서가 토글할 수 없도록 비활성화 스위치(디스플레이 용) */}
    <label style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8, opacity: 0.6 }}>
      <input type="checkbox" checked={!!igVerifiedAt} readOnly />
      <span>관리자만 변경할 수 있습니다</span>
    </label>

    <Link href={`/i/${params.slug}`} className={`${styles.btn} ${styles.btnGhost}`}>
      프로필로 이동
    </Link>
  </div>
  <div className={styles.hint} style={{ marginTop: 8 }}>
    * 인증 상태는 관리자(Admin) 페이지에서만 변경할 수 있습니다.
  </div>
</section>


      {/* ===== 포스트 목록 ===== */}
      {loading ? (
        <div className={styles.hint}>불러오는 중… ⏳</div>
      ) : posts.length === 0 ? (
        <div className={styles.hint}>작성한 포스트가 없습니다.</div>
      ) : (
        <section>
          <div className={styles.fieldsetTitle} style={{ marginBottom: 10 }}>
            포스트 관리
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
            {posts.map((p) => (
              <div
                key={p.id}
                style={{
                  position: "relative",
                  borderRadius: 16,
                  overflow: "hidden",
                  border: "1px solid rgba(0,0,0,0.08)",
                  background: "#fff",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", background: "#e9ecf1" }}>
                  {p.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.cover_image_url}
                      alt=""
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, background: "#e9ecf1" }} />
                  )}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                    padding: 10,
                    background: "#fff",
                    borderTop: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => openEdit(p.id)}>
                    {editLoading && editPostId === p.id ? "불러오는 중…" : "편집"}
                  </button>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => router.push(`/post/${p.id}`)}>
                    보기
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== 편집 모달 ===== */}
      {editOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "grid",
            placeItems: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: "min(860px, 92vw)",
              maxHeight: "90vh",
              overflow: "auto",
              background: "#fff",
              borderRadius: 16,
              padding: 16,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div className={styles.fieldset}>
              <div className={styles.fieldsetTitle}>포스트 편집</div>
              {editLoading ? (
                <div className={styles.hint}>불러오는 중… ⏳</div>
              ) : (
                <div className={styles.form}>
                  <label className={styles.label}>
                    제목
                    <input className={styles.input} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  </label>

                  <label className={styles.label} style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
                    <input type="checkbox" checked={editPublished} onChange={(e) => setEditPublished(e.target.checked)} />
                    <span>Published</span>
                  </label>

                  <div className={styles.label}>
                    <div className={styles.fieldsetTitle}>커버 이미지</div>
                    {editCoverPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={editCoverPreview}
                        alt="cover"
                        style={{ width: 160, height: 160, borderRadius: 12, objectFit: "cover", background: "#eee" }}
                      />
                    ) : (
                      <div className={styles.hint}>현재 커버 없음</div>
                    )}
                    <input
                      className={styles.input}
                      type="file"
                      accept="image/*"
                      onChange={(e) => onEditCoverChange(e.target.files?.[0] ?? null)}
                    />
                    <label className={styles.label} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                      <input type="checkbox" checked={editClearCover} onChange={(e) => setEditClearCover(e.target.checked)} />
                      <span>커버 제거(빈 값으로 설정)</span>
                    </label>
                  </div>

                  {/* 기존 제품 편집/삭제 */}
                  <div>
                    <div className={styles.fieldsetTitle}>연결된 제품 (편집/삭제)</div>
                    <div className={styles.linksStack}>
                      {editProducts.length === 0 && <div className={styles.hint}>연결된 제품이 없습니다.</div>}
                      {editProducts.map((p, i) => (
                        <div key={i} className={styles.linkRow} style={{ gridTemplateColumns: "1fr 1fr 1fr auto" }}>
                          <input
                            className={styles.input}
                            placeholder="브랜드"
                            value={p.brand}
                            onChange={(e) => changeEditProduct(i, "brand", e.target.value)}
                          />
                          <input
                            className={styles.input}
                            placeholder="제품명"
                            value={p.name}
                            onChange={(e) => changeEditProduct(i, "name", e.target.value)}
                          />
                          <input
                            className={styles.input}
                            placeholder="링크(URL)"
                            value={p.url}
                            onChange={(e) => changeEditProduct(i, "url", e.target.value)}
                          />
                          <div className={styles.rowRight}>
                            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                              <input type="checkbox" checked={p.keep ?? true} onChange={() => toggleKeepEditProduct(i)} />
                              <span>유지</span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 새 제품 추가 */}
                  <div>
                    <div className={styles.fieldsetTitle}>새 제품 추가 (브랜드/제품명/링크)</div>
                    <div className={styles.linksStack}>
                      {newProducts.map((row, i) => (
                        <div key={i} className={styles.linkRow} style={{ gridTemplateColumns: "1fr 1fr 1fr auto" }}>
                          <input
                            className={styles.input}
                            placeholder="브랜드"
                            value={row.brand}
                            onChange={(e) => changeNewProduct(i, "brand", e.target.value)}
                          />
                          <input
                            className={styles.input}
                            placeholder="제품명"
                            value={row.name}
                            onChange={(e) => changeNewProduct(i, "name", e.target.value)}
                          />
                          <input
                            className={styles.input}
                            placeholder="링크(URL)"
                            value={row.url}
                            onChange={(e) => changeNewProduct(i, "url", e.target.value)}
                          />
                          <div className={styles.rowRight}>
                            <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => removeNewProductRow(i)}>
                              삭제
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className={styles.rowRight}>
                        <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={addNewProductRow}>
                          + 제품 추가
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={styles.footer}>
                    <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={saveEdit}>
                      저장
                    </button>
                    <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setEditOpen(false)}>
                      닫기
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
