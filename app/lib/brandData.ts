export type BrandDef = {
  slug: string;
  label: string;
  keywords: string[];
};

export const brands: BrandDef[] = [
  { slug: "chanel", label: "Chanel", keywords: ["chanel"] },
  { slug: "gucci", label: "Gucci", keywords: ["gucci"] },
  { slug: "prada", label: "Prada", keywords: ["prada"] },
  { slug: "louis-vuitton", label: "Louis Vuitton", keywords: ["louis vuitton", "lv "] },
  { slug: "hermes", label: "Hermes", keywords: ["hermes", "hermès"] },
  { slug: "dior", label: "Dior", keywords: ["dior"] },
  { slug: "versace", label: "Versace", keywords: ["versace"] },
  { slug: "fendi", label: "Fendi", keywords: ["fendi"] },
  { slug: "balenciaga", label: "Balenciaga", keywords: ["balenciaga"] },
  { slug: "saint-laurent", label: "Saint Laurent", keywords: ["saint laurent", "ysl", "yves saint laurent"] },
  { slug: "burberry", label: "Burberry", keywords: ["burberry"] },
  { slug: "coach", label: "Coach", keywords: ["coach"] },
  { slug: "celine", label: "Celine", keywords: ["celine", "céline"] },
  { slug: "bottega-veneta", label: "Bottega Veneta", keywords: ["bottega veneta", "bottega"] },
  { slug: "valentino", label: "Valentino", keywords: ["valentino"] },
  { slug: "givenchy", label: "Givenchy", keywords: ["givenchy"] },
  { slug: "dolce-gabbana", label: "Dolce & Gabbana", keywords: ["dolce & gabbana", "dolce and gabbana", "d&g"] },
  { slug: "miu-miu", label: "Miu Miu", keywords: ["miu miu"] },
  { slug: "loewe", label: "Loewe", keywords: ["loewe"] },
  { slug: "jimmy-choo", label: "Jimmy Choo", keywords: ["jimmy choo"] },
  { slug: "manolo-blahnik", label: "Manolo Blahnik", keywords: ["manolo blahnik", "blahnik"] },
  { slug: "christian-louboutin", label: "Christian Louboutin", keywords: ["louboutin"] },
  { slug: "ferragamo", label: "Ferragamo", keywords: ["ferragamo", "salvatore ferragamo"] },
  { slug: "marc-jacobs", label: "Marc Jacobs", keywords: ["marc jacobs"] },
  { slug: "vivienne-westwood", label: "Vivienne Westwood", keywords: ["vivienne westwood"] },
];

export const brandMap = Object.fromEntries(
  brands.map((b) => [b.slug, b.label])
) as Record<string, string>;
