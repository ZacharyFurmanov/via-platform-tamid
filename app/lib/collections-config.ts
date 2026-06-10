export const COLLECTIONS = [
  { slug: "editors-picks", name: "Everyone's Favorites", curatedBy: "The VYA Community", href: "/editors-picks", description: "The most-loved pieces from our community of tastemakers — ranked by the people with the best taste." },
  { slug: "carly", name: "Carly's Shoe Collection", curatedBy: "Carly Christina", href: "/stores/carly", description: "A curated destination for vintage and secondhand shoes, hand-selected by Carly Christina." },
  { slug: "bridal-era", name: "Bridal Era", curatedBy: "TheElleCollective", href: null, description: "For every bride-to-be searching for her something borrowed — vintage pieces worthy of the biggest day." },
  { slug: "spring-edition", name: "Spring Edition", curatedBy: "Alexa June", href: null, description: "Fresh picks for a new season. Light layers, floral prints, and the kind of pieces that feel like spring." },
  { slug: "zara-larsson", name: "Zara Larsson", curatedBy: "Elsa Fink", href: null, description: "Pop star energy meets vintage charm. Statement pieces with attitude, curated for anyone who dresses like they're headlining." },
  { slug: "summer-edit", name: "Summer Edit", curatedBy: "Sophia Tiago", href: null, description: "The season's best vintage finds — vibrant color, easy silhouettes, and pieces made for warm days and long nights." },
  { slug: "hot-vintage-summer", name: "Hot Vintage Summer", curatedBy: "Matty Siegel", href: null, description: "A curated edit of the pieces you'd find on the coolest girl in SoHo" },
  { slug: "rachael-edit", name: "The Rachael Edit", curatedBy: "Rachael Brownfield", href: null, description: "A celebration of natural materials and quiet quality — pieces made to last, chosen for how they feel as much as how they look." },
  { slug: "y2k-girls", name: "Y2K Girls", curatedBy: "", href: null, description: "Pure 2000s energy — baby tees, low-rise, logomania, and the it-bags of the era. For the girls who do it Y2K." },
] as const;

export type CollectionSlug = (typeof COLLECTIONS)[number]["slug"];
