// client-only helpers
export function getOrSetClientId(): string {
  const key = "mw_cid";
  const fromCookie = document.cookie.split("; ").find(x => x.startsWith(key + "="))?.split("=")[1];
  if (fromCookie) return fromCookie;
  const id = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  document.cookie = `${key}=${id}; max-age=${60 * 60 * 24 * 365}; path=/; samesite=lax`;
  return id;
}

function send(url: string, payload: any) {
  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  if ("sendBeacon" in navigator) {
    navigator.sendBeacon(url, blob); // 네비게이션 비차단
  } else {
    fetch(url, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    }).catch(() => {});
  }
}

export function trackPageView(params: { influencerSlug?: string; path?: string }) {
  const clientId = getOrSetClientId();
  send("/api/track", {
    type: "page_view",
    influencerSlug: params.influencerSlug,
    path: params.path ?? location.pathname,
    clientId,
  });
}

export function trackProductClick(params: { postId?: string; productId?: string; influencerSlug?: string }) {
  const clientId = getOrSetClientId();
  send("/api/track", {
    type: "product_click",
    postId: params.postId,
    productId: params.productId,
    influencerSlug: params.influencerSlug,
    path: location.pathname,
    clientId,
  });
}
