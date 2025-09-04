// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "umytqvdmigkwyhjeaaku.supabase.co", // Supabase
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com", // ✅ Unsplash
      },
    ],
  },
};

export default nextConfig;
