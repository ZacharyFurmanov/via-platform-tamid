export type BrandDef = {
  slug: string;
  label: string;
  keywords: string[];
};

export const brands: BrandDef[] = [
  // Mega luxury
  { slug: "chanel", label: "Chanel", keywords: ["chanel"] },
  { slug: "hermes", label: "Hermes", keywords: ["hermes", "hermès"] },
  { slug: "louis-vuitton", label: "Louis Vuitton", keywords: ["louis vuitton", "lv"] },
  { slug: "dior", label: "Dior", keywords: ["dior", "christian dior", "cd"] },
  { slug: "gucci", label: "Gucci", keywords: ["gucci"] },
  { slug: "prada", label: "Prada", keywords: ["prada"] },
  { slug: "bottega-veneta", label: "Bottega Veneta", keywords: ["bottega veneta", "bottega", "bv"] },
  { slug: "saint-laurent", label: "Saint Laurent", keywords: ["saint laurent", "ysl", "yves saint laurent"] },
  { slug: "balenciaga", label: "Balenciaga", keywords: ["balenciaga"] },
  { slug: "celine", label: "Celine", keywords: ["celine", "céline"] },
  { slug: "loewe", label: "Loewe", keywords: ["loewe"] },
  { slug: "fendi", label: "Fendi", keywords: ["fendi"] },
  { slug: "valentino", label: "Valentino", keywords: ["valentino"] },
  { slug: "giuseppe-zanotti", label: "Giuseppe Zanotti", keywords: ["giuseppe zanotti", "zanotti"] },
  { slug: "givenchy", label: "Givenchy", keywords: ["givenchy"] },
  { slug: "versace", label: "Versace", keywords: ["versace", "gianni versace"] },
  { slug: "dolce-gabbana", label: "Dolce & Gabbana", keywords: ["dolce & gabbana", "dolce and gabbana", "dolce gabbana", "d&g"] },
  { slug: "burberry", label: "Burberry", keywords: ["burberry"] },
  { slug: "miu-miu", label: "Miu Miu", keywords: ["miu miu"] },
  { slug: "balmain", label: "Balmain", keywords: ["balmain"] },
  { slug: "lanvin", label: "Lanvin", keywords: ["lanvin"] },
  // Contemporary luxury
  { slug: "alexander-mcqueen", label: "Alexander McQueen", keywords: ["alexander mcqueen", "mcqueen"] },
  { slug: "stella-mccartney", label: "Stella McCartney", keywords: ["stella mccartney"] },
  { slug: "maison-margiela", label: "Maison Margiela", keywords: ["margiela", "maison margiela", "mm6", "martin margiela"] },
  { slug: "marni", label: "Marni", keywords: ["marni"] },
  { slug: "missoni", label: "Missoni", keywords: ["missoni"] },
  { slug: "moschino", label: "Moschino", keywords: ["moschino"] },
  { slug: "tom-ford", label: "Tom Ford", keywords: ["tom ford"] },
  { slug: "proenza-schouler", label: "Proenza Schouler", keywords: ["proenza schouler", "ps1"] },
  { slug: "acne-studios", label: "Acne Studios", keywords: ["acne studios", "acne"] },
  { slug: "rag-bone", label: "Rag & Bone", keywords: ["rag & bone", "rag and bone"] },
  { slug: "alexander-wang", label: "Alexander Wang", keywords: ["alexander wang"] },
  { slug: "kenzo", label: "Kenzo", keywords: ["kenzo"] },
  { slug: "mcm", label: "MCM", keywords: ["mcm"] },
  { slug: "mulberry", label: "Mulberry", keywords: ["mulberry"] },
  { slug: "paul-smith", label: "Paul Smith", keywords: ["paul smith"] },
  // Vintage / archive
  { slug: "helmut-lang", label: "Helmut Lang", keywords: ["helmut lang"] },
  { slug: "thierry-mugler", label: "Thierry Mugler", keywords: ["mugler", "thierry mugler"] },
  { slug: "azzedine-alaia", label: "Azzedine Alaïa", keywords: ["alaia", "alaïa", "azzedine alaia"] },
  { slug: "comme-des-garcons", label: "Comme des Garçons", keywords: ["comme des garçons", "comme des garcons", "cdg", "commes des garcons"] },
  { slug: "issey-miyake", label: "Issey Miyake", keywords: ["issey miyake", "pleats please"] },
  { slug: "yohji-yamamoto", label: "Yohji Yamamoto", keywords: ["yohji yamamoto", "y's yohji", "y-3"] },
  { slug: "jean-paul-gaultier", label: "Jean Paul Gaultier", keywords: ["jean paul gaultier", "jpg", "gaultier"] },
  { slug: "emilio-pucci", label: "Emilio Pucci", keywords: ["pucci", "emilio pucci"] },
  { slug: "halston", label: "Halston", keywords: ["halston"] },
  { slug: "pierre-cardin", label: "Pierre Cardin", keywords: ["pierre cardin"] },
  { slug: "claude-montana", label: "Claude Montana", keywords: ["claude montana", "montana"] },
  { slug: "sonia-rykiel", label: "Sonia Rykiel", keywords: ["sonia rykiel"] },
  { slug: "oscar-de-la-renta", label: "Oscar de la Renta", keywords: ["oscar de la renta"] },
  { slug: "nina-ricci", label: "Nina Ricci", keywords: ["nina ricci"] },
  { slug: "ungaro", label: "Ungaro", keywords: ["ungaro", "emanuel ungaro"] },
  // American designer
  { slug: "ralph-lauren", label: "Ralph Lauren", keywords: ["ralph lauren", "polo ralph lauren", "ralph"] },
  { slug: "calvin-klein", label: "Calvin Klein", keywords: ["calvin klein", "ck"] },
  { slug: "donna-karan", label: "Donna Karan", keywords: ["donna karan", "dkny"] },
  { slug: "diane-von-furstenberg", label: "Diane von Furstenberg", keywords: ["diane von furstenberg", "dvf"] },
  { slug: "michael-kors", label: "Michael Kors", keywords: ["michael kors", "mk"] },
  { slug: "kate-spade", label: "Kate Spade", keywords: ["kate spade"] },
  { slug: "tory-burch", label: "Tory Burch", keywords: ["tory burch"] },
  // Shoes
  { slug: "jimmy-choo", label: "Jimmy Choo", keywords: ["jimmy choo"] },
  { slug: "manolo-blahnik", label: "Manolo Blahnik", keywords: ["manolo blahnik", "blahnik"] },
  { slug: "christian-louboutin", label: "Christian Louboutin", keywords: ["louboutin", "christian louboutin"] },
  { slug: "ferragamo", label: "Ferragamo", keywords: ["ferragamo", "salvatore ferragamo"] },
  { slug: "coach", label: "Coach", keywords: ["coach"] },
  // Other
  { slug: "giorgio-armani", label: "Giorgio Armani", keywords: ["armani", "giorgio armani", "emporio armani", "ea7"] },
  { slug: "roberto-cavalli", label: "Roberto Cavalli", keywords: ["cavalli", "roberto cavalli", "just cavalli"] },
  { slug: "max-mara", label: "Max Mara", keywords: ["max mara"] },
  { slug: "hugo-boss", label: "Hugo Boss", keywords: ["hugo boss", "boss"] },
  { slug: "vivienne-westwood", label: "Vivienne Westwood", keywords: ["vivienne westwood"] },
  { slug: "marc-jacobs", label: "Marc Jacobs", keywords: ["marc jacobs"] },
  { slug: "etro", label: "Etro", keywords: ["etro"] },
];

export const brandMap = Object.fromEntries(
  brands.map((b) => [b.slug, b.label])
) as Record<string, string>;
