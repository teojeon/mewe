export const metadata = { title: "My Webapp", description: "Minimal Next + Supabase" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-neutral-50 text-neutral-900">
        <header className="sticky top-0 z-10 border-b bg-white/70 backdrop-blur">
          <div className="mx-auto max-w-screen-xl px-3 sm:px-4 h-14 flex items-center justify-between">
            <a href="/" className="font-semibold">My Webapp</a>
            <nav className="text-sm text-neutral-600">
              <a href="/admin" className="hover:underline">Admin</a>
            </nav>
          </div>
        </header>

        {/* 폭 제한을 크게 풀고, 내부 페이지가 자체적으로 중앙정렬/그리드 구성 */}
        <main className="mx-auto max-w-screen-xl px-3 sm:px-4 py-6 sm:py-8">{children}</main>

        <footer className="border-t py-6 text-sm text-neutral-500">
          <div className="mx-auto max-w-screen-xl px-3 sm:px-4">© {new Date().getFullYear()} My Webapp</div>
        </footer>
      </body>
    </html>
  );
}
