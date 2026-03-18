import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/categories/clothes",
        destination: "/categories/clothing",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      // Shopify CDN (product images)
      { protocol: "https", hostname: "**.shopify.com" },
      { protocol: "https", hostname: "**.shopifycdn.com" },
      // Shopify Collabs CDN
      { protocol: "https", hostname: "**.collabs.shop" },
      // Squarespace (LEI, Montrose Edit)
      { protocol: "https", hostname: "**.squarespace.com" },
      { protocol: "https", hostname: "**.sqspcdn.com" },
      // Big Cartel
      { protocol: "https", hostname: "**.bigcartel.com" },
      // Generic CDNs used by stores
      { protocol: "https", hostname: "**.cloudinary.com" },
      { protocol: "https", hostname: "**.imgix.net" },
    ],
  },
};

export default nextConfig;
