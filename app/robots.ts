import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/store/dashboard", "/account/"],
    },
    sitemap: "https://vyaplatform.com/sitemap.xml",
  };
}
