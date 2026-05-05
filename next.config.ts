import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    const socialSources = [
      { path: "instagram", source: "instagram", campaign: "instagram_bio" },
      { path: "ig",        source: "instagram", campaign: "instagram_bio" },
      { path: "tiktok",   source: "tiktok",    campaign: "tiktok_bio" },
      { path: "tt",        source: "tiktok",    campaign: "tiktok_bio" },
      { path: "linkedin",  source: "linkedin",  campaign: "linkedin_bio" },
      { path: "li",        source: "linkedin",  campaign: "linkedin_bio" },
      { path: "pinterest", source: "pinterest", campaign: "pinterest_bio" },
      { path: "threads",   source: "threads",   campaign: "threads_bio" },
      { path: "facebook",  source: "facebook",  campaign: "facebook_bio" },
      { path: "youtube",   source: "youtube",   campaign: "youtube_bio" },
      { path: "substack",  source: "substack",  campaign: "substack_bio" },
    ];

    return [
      {
        source: "/categories/clothes",
        destination: "/categories/clothing",
        permanent: true,
      },
      ...socialSources.map(({ path, source, campaign }) => ({
        source: `/${path}`,
        destination: `/?utm_source=${source}&utm_medium=social&utm_campaign=${campaign}`,
        permanent: false,
      })),
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Shopify CDN (product images)
      { protocol: "https", hostname: "**.shopify.com" },
      { protocol: "https", hostname: "**.shopifycdn.com" },
      { protocol: "https", hostname: "cdn.shopify.com" },
      // Shopify Collabs CDN
      { protocol: "https", hostname: "**.collabs.shop" },
      // Squarespace (LEI, Montrose Edit)
      { protocol: "https", hostname: "**.squarespace.com" },
      { protocol: "https", hostname: "**.sqspcdn.com" },
      { protocol: "https", hostname: "**.squarespace-cdn.com" },
      // Big Cartel
      { protocol: "https", hostname: "**.bigcartel.com" },
      // Square CDN
      { protocol: "https", hostname: "**.squareup.com" },
      { protocol: "https", hostname: "items-images.squareup.com" },
      // Generic CDNs used by stores
      { protocol: "https", hostname: "**.cloudinary.com" },
      { protocol: "https", hostname: "**.imgix.net" },
      { protocol: "https", hostname: "**.amazonaws.com" },
      // Store custom domains (images served directly from store sites)
      { protocol: "https", hostname: "shopfortheglobe.com" },
      { protocol: "https", hostname: "**.shopfortheglobe.com" },
      // Vercel Blob (sourcing request image uploads)
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
