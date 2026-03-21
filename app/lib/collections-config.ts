export const COLLECTIONS = [
  { slug: "editors-picks", name: "Editor's Picks", curatedBy: null },
  { slug: "bridal-era", name: "Bridal Era", curatedBy: "TheElleCollective" },
  { slug: "coachella", name: "Coachella", curatedBy: null },
  { slug: "spring-edition", name: "Spring Edition", curatedBy: null },
] as const;

export type CollectionSlug = (typeof COLLECTIONS)[number]["slug"];
