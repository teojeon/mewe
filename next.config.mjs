/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Next.js 이미지 최적화 사용 + 외부 도메인 허용
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
