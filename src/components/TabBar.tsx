// components/TabBar.tsx
"use client";

import { usePathname, useRouter } from "next/navigation";

type Tab = { key: string; label: string; href: string; icon: JSX.Element };

export default function TabBar() {
  const pathname = usePathname();
  const router = useRouter();

  const tabs: Tab[] = [
    {
      key: "home",
      label: "홈",
      href: "/",
      icon: (
        <svg className="icon-24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 11.5 12 4l9 7.5" strokeWidth="1.5" />
          <path d="M5 10.5V20h14v-9.5" strokeWidth="1.5" />
        </svg>
      ),
    },
    {
      key: "search",
      label: "탐색",
      href: "/search",
      icon: (
        <svg className="icon-24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="7" strokeWidth="1.5"/>
          <path d="M20 20l-3.2-3.2" strokeWidth="1.5"/>
        </svg>
      ),
    },
    {
      key: "upload",
      label: "업로드",
      href: "/upload",
      icon: (
        <svg className="icon-24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 4v12" strokeWidth="1.5"/>
          <path d="M6 10l6-6 6 6" strokeWidth="1.5"/>
          <path d="M5 20h14" strokeWidth="1.5"/>
        </svg>
      ),
    },
    {
      key: "profile",
      label: "프로필",
      href: "/profile",
      icon: (
        <svg className="icon-24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="8" r="4" strokeWidth="1.5"/>
          <path d="M4 20c2.5-4 13.5-4 16 0" strokeWidth="1.5"/>
        </svg>
      ),
    },
  ];

  return (
    <nav className="app-tabbar" role="navigation" aria-label="하단 탭바">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <button
            key={t.key}
            className="tab-btn"
            aria-current={active ? "page" : undefined}
            onClick={() => router.push(t.href)}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
