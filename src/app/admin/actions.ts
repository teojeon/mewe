// src/app/admin/actions.ts
"use server";
import { supabaseServer } from "@/lib/supabase-server";

export async function createInfluencer(formData: FormData) {
  const slug = String(formData.get("slug") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const avatar_url = String(formData.get("avatar_url") || "").trim() || null;
  const bio = String(formData.get("bio") || "").trim() || null;
  const links_raw = String(formData.get("links_json") || "[]").trim();

  if (!slug) throw new Error("slug는 필수입니다.");
  if (!name) throw new Error("name은 필수입니다.");

  let links: any[] = [];
  try {
    links = JSON.parse(links_raw || "[]");
    if (!Array.isArray(links)) links = [];
  } catch {
    links = [];
  }

  const s = supabaseServer();
  const { error } = await s.from("influencers").insert({
    slug, name, avatar_url, bio, links,
  });
  if (error) throw error;
}

export async function createPost(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const cover = String(formData.get("cover_image_url") || "").trim();
  const body  = String(formData.get("body") || "").trim();
  const raw   = String(formData.get("products_json") || "[]").trim();
  const influencer_id = String(formData.get("influencer_id") || "").trim() || null;

  if (!title) throw new Error("제목은 필수입니다.");
  if (!cover) throw new Error("cover_image_url은 필수입니다.");

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // 입력 실수 보정: 스마트따옴표/홑따옴표/트레일링 콤마
    const fixed = raw.replace(/[“”＂‵′]/g, '"').replace(/'/g, '"').replace(/,(\s*[\]}])/g, "$1");
    parsed = JSON.parse(fixed);
  }
  const arr = Array.isArray(parsed) ? parsed : [parsed];
  const products = arr.map((p) => ({
    name: String(p?.name ?? "").trim(),
    brand: p?.brand ? String(p.brand) : null,
    price: p?.price != null && !Number.isNaN(Number(p.price)) ? Number(p.price) : null,
    currency: p?.currency ? String(p.currency) : "KRW",
    external_url: p?.external_url ? String(p.external_url) : null,
    image_url: p?.image_url ? String(p.image_url) : null,
  }));

  const s = supabaseServer();
  const { error } = await s.from("posts").insert({
    title,
    cover_image_url: cover,
    body: body || null,
    meta: { products },
    published: true,
    influencer_id, // ← NEW
  });
  if (error) throw error;
}
