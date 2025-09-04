// src/components/HeaderGate.tsx
"use client";
import { usePathname } from "next/navigation";

export default function HeaderGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/i/")) return null;
  return <>{children}</>;
}
