export const COLLECTIONS = [
  { slug: "editors-picks", name: "Editor's Picks", curatedBy: null },
  { slug: "bridal-era", name: "Bridal Era", curatedBy: "TheElleCollective" },
  { slug: "coachella", name: "Coachella", curatedBy: "Kendell Browning" },
  { slug: "spring-edition", name: "Spring Edition", curatedBy: "Alexa June" },
  { slug: "zara-larsson", name: "Zara Larsson", curatedBy: "Elsa Fink" },
] as const;

export type CollectionSlug = (typeof COLLECTIONS)[number]["slug"];
