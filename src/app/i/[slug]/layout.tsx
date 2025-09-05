import type { ReactNode } from "react";
import Header from "@/components/Header";

export default function InfluencerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}
