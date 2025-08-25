// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "../components/Header";
import TabBar from "../components/TabBar";

export const metadata: Metadata = {
  title: "mewe",
  description: "Mobile-first web app",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // iOS safe-area 대응
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <div id="app-root">
          <Header />
          <main role="main" className="app-main">
            {children}
          </main>
          <TabBar />
        </div>
      </body>
    </html>
  );
}
