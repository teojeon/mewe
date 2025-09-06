"use client";
import { useEffect } from "react";
import { trackPageView } from "@/lib/track";

export default function TrackInfluencerView({ slug }: { slug: string }) {
  useEffect(() => {
    trackPageView({ influencerSlug: slug });
  }, [slug]);
  return null;
}
