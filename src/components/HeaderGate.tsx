// src/components/HeaderGate.tsx
"use client";
import { usePathname } from "next/navigation";

export default function HeaderGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/i/")) return null;
  if (pathname.startsWith("/post/")) return null; // ✅ /post/* 에서도 전역 헤더 숨김
  return <>{children}</>;
}
