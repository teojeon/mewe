// src/components/PageFade.tsx
"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

/**
 * Lightweight page transition:
 * - Skips animation on first render to avoid perceived load delay
 * - Fades in on client navigations only (opacity-only for compositor fast path)
 */
export default function PageFade({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const first = React.useRef(true);
  const [cls, setCls] = React.useState<string>("");

  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      setCls(""); // no animation on first paint
      return;
    }
    // trigger a short fade only on client route changes
    setCls("page-fade");
    const t = window.setTimeout(() => setCls(""), 220); // cleanup class after animation
    return () => window.clearTimeout(t);
  }, [pathname]);

  return <div className={cls}>{children}</div>;
}
