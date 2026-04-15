export const COLLECTIONS = [
  { slug: "editors-picks", name: "Everyone's Favorites", curatedBy: "The VYA Community", href: "/editors-picks", description: "The most-loved pieces from our community of tastemakers — ranked by the people with the best taste." },
  { slug: "carly", name: "Carly's Shoe Collection", curatedBy: "Carly Christina", href: "/stores/carly", description: "A curated destination for vintage and secondhand shoes, hand-selected by Carly Christina." },
  { slug: "bridal-era", name: "Bridal Era", curatedBy: "TheElleCollective", href: null, description: "For every bride-to-be searching for her something borrowed — vintage pieces worthy of the biggest day." },
  { slug: "coachella", name: "Coachella", curatedBy: "Kendell Browning", href: null, description: "Festival-ready vintage finds curated for the desert. Bold, free-spirited, and made to be worn under the sun." },
  { slug: "spring-edition", name: "Spring Edition", curatedBy: "Alexa June", href: null, description: "Fresh picks for a new season. Light layers, floral prints, and the kind of pieces that feel like spring." },
  { slug: "zara-larsson", name: "Zara Larsson", curatedBy: "Elsa Fink", href: null, description: "Pop star energy meets vintage charm. Statement pieces with attitude, curated for anyone who dresses like they're headlining." },
  { slug: "the-vintage-edit", name: "The Vintage Edit", curatedBy: "thevintagedit", href: null, description: "Curated vintage essentials for the discerning eye. Timeless pieces, carefully edited." },
  { slug: "the-kamryn-edit", name: "The Kamryn Edit", curatedBy: "Kamryn Des Jardin", href: null, description: "Effortlessly cool vintage finds curated by Kamryn Des Jardin. Bold pieces with a timeless edge." },
  { slug: "mothers-day", name: "Mother's Day", curatedBy: "Lisa from Get Styled by Lisa Teich", href: null, description: "Every cool Mom needs these for her lifestyle. Whether it's running w babies and needing a chic baby bag, going out to dinner w grown kids needing a chic ballet flat & shoulder bag or chic Glam-Mas. These accessories will fit \"all the things\" for all the Moms out there!" },
] as const;

export type CollectionSlug = (typeof COLLECTIONS)[number]["slug"];
