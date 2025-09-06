"use client";
import Link from "next/link";
import { trackProductClick } from "@/lib/track";

type IdLike = string | number | null | undefined;

type Props = {
  href: string;
  postId?: IdLike;
  productId?: IdLike;          // string | number 허용
  influencerSlug?: string;
  className?: string;
  children: React.ReactNode;
  target?: string;
  rel?: string;
};

export default function ProductTrackLink({
  href, postId, productId, influencerSlug, className, children, target, rel
}: Props) {
  const postIdStr = postId != null ? String(postId) : undefined;
  const productIdStr = productId != null ? String(productId) : undefined;

  return (
    <Link
      href={href}
      className={className}
      target={target}
      rel={rel}
      onClick={() => trackProductClick({ postId: postIdStr, productId: productIdStr, influencerSlug })}
    >
      {children}
    </Link>
  );
}
