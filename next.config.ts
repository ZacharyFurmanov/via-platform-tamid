import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/categories/clothes",
        destination: "/categories/other-clothing",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
