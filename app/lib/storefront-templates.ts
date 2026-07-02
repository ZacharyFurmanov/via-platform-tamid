// Storefront starter templates for new stores without a website. Grounded in the
// real VYA-store sites (palettes, type, hero style). A store picks one as a starting
// point, then customizes colors + fonts freely — both write the same theme fields
// the storefront already renders (theme.colors / theme.fonts).

export type HeroStyle = "carousel" | "text-over-image" | "logo-masthead" | "drop-banner" | "minimal";

export type StorefrontTemplate = {
 id: string;
 name: string;
 description: string;
 colors: { bg: string; text: string; accent: string };
 fonts: { heading: string; body: string };
 heroStyle: HeroStyle;
};

export const STOREFRONT_TEMPLATES: StorefrontTemplate[] = [
 {
 id: "editorial-luxe",
 name: "Editorial Luxe",
 description: "Cream and black with a high-contrast fashion-magazine serif. The premium boutique look.",
 colors: { bg: "#FFFDF8", text: "#1a1a1a", accent: "#1a1a1a" },
 fonts: { heading: "Playfair Display", body: "Inter" },
 heroStyle: "carousel",
 },
 {
 id: "modern-minimal",
 name: "Modern Minimal",
 description: "Clean white with a crisp geometric sans. Lets the product photography do the talking.",
 colors: { bg: "#ffffff", text: "#1c1c1c", accent: "#1c1c1c" },
 fonts: { heading: "Outfit", body: "Inter" },
 heroStyle: "minimal",
 },
 {
 id: "literary-archive",
 name: "Literary Archive",
 description: "Soft white and an all-serif, book-like feel. Atmospheric, story-forward.",
 colors: { bg: "#faf9f6", text: "#161616", accent: "#161616" },
 fonts: { heading: "Newsreader", body: "Newsreader" },
 heroStyle: "text-over-image",
 },
 {
 id: "romantic",
 name: "Romantic",
 description: "Warm cream with a berry accent and an elegant serif headline. Soft and feminine.",
 colors: { bg: "#f5f2ee", text: "#2a1a22", accent: "#8d2c5b" },
 fonts: { heading: "Playfair Display", body: "Poppins" },
 heroStyle: "text-over-image",
 },
 {
 id: "warm-earthy",
 name: "Warm Earthy",
 description: "Saturated terracotta and gold, approachable all-sans. Eclectic and sun-faded.",
 colors: { bg: "#c97855", text: "#f6f1e9", accent: "#c8a04a" },
 fonts: { heading: "Montserrat", body: "Montserrat" },
 heroStyle: "logo-masthead",
 },
 {
 id: "playful-drop",
 name: "Playful Drop",
 description: "Clean white with one punchy accent and a drop-announcement banner. Young and loud.",
 colors: { bg: "#ffffff", text: "#111111", accent: "#ff1086" },
 fonts: { heading: "Space Grotesk", body: "Inter" },
 heroStyle: "drop-banner",
 },
];

export function getTemplate(id: string): StorefrontTemplate | undefined {
 return STOREFRONT_TEMPLATES.find((t) => t.id === id);
}

// Curated fonts a store can swap to (Google Fonts — the storefront loads them by name).
export const HEADING_FONTS = ["Playfair Display", "Bodoni Moda", "Cormorant Garamond", "Newsreader", "Instrument Serif", "Fraunces", "Outfit", "Space Grotesk", "Archivo", "Montserrat", "Jost"];
export const BODY_FONTS = ["Inter", "Newsreader", "Poppins", "Montserrat", "Figtree", "Outfit", "Work Sans", "Nunito Sans", "Roboto"];
