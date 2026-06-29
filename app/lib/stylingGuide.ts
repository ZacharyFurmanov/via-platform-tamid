// Homepage "Styling Guide" — shoppable looks. Each look is an editorial photo
// (in /public/y2k-edit/) plus the pieces in it, linked to their product pages.
// Add more looks here and they'll render on the homepage automatically.

export type StylingLookItem = { label: string; url: string };

export type StylingLook = {
 /** Image under /public (e.g. /y2k-edit/look-1.jpg). */
 image: string;
 /** Optional caption shown under the look. */
 caption?: string;
 /** Shoppable pieces in the look. */
 items: StylingLookItem[];
};

export const STYLING_LOOKS: StylingLook[] = [
 {
 image: "/y2k-edit/look-1.jpg",
 items: [
 { label: "Dress", url: "/products/mookie-studios-1895088" },
 { label: "Sunglasses", url: "/products/petria-vintage-132836" },
 ],
 },
 {
 image: "/y2k-edit/look-2.jpg",
 items: [
 { label: "Jacket", url: "/products/sourced-by-scottie-1745827" },
 { label: "Shorts", url: "/products/lover-girl-vintage-1176959" },
 { label: "Boots", url: "/products/rareality-archive-1988266" },
 { label: "Bag", url: "/products/to-us-vintage-1948579" },
 ],
 },
 {
 image: "/y2k-edit/look-3.jpg",
 items: [
 { label: "Bag", url: "/products/hachi-archive-1252723" },
 { label: "Shoes", url: "/products/club-fleur-1495396" },
 { label: "Skirt", url: "/products/lover-girl-vintage-1393591" },
 ],
 },
 {
 image: "/y2k-edit/look-4.jpg",
 items: [
 { label: "Top", url: "/products/sourced-by-scottie-1506092" },
 { label: "Shorts", url: "/products/mookie-studios-1895081" },
 { label: "Shoes", url: "/products/chill-boutique-2256064" },
 ],
 },
 {
 image: "/y2k-edit/look-5.jpg",
 items: [
 { label: "Top", url: "/products/mookie-studios-1895099" },
 { label: "Jeans", url: "/products/sourced-by-scottie-1987435" },
 { label: "Bag", url: "/products/promised-vintage-91691" },
 { label: "Shoes", url: "/products/capsule-edit-2028118" },
 ],
 },
 {
 image: "/styling-guide/post-56.jpg",
 items: [
 { label: "Earrings", url: "/products/sheer-vintage-38608" },
 { label: "Dress", url: "/products/blodas-choice-1858323" },
 { label: "Purse", url: "/products/tess-elizabeth-vintage-695266" },
 { label: "Shoes", url: "/products/club-fleur-2178595" },
 ],
 },
 {
 image: "/styling-guide/post-57.jpg",
 items: [
 { label: "Top", url: "/products/maison-optimism-vintage-1763189" },
 { label: "Skirt", url: "/products/edited-archive-1655057" },
 { label: "Shoes", url: "/products/vintage-archives-la-234" },
 { label: "Bag", url: "/products/hachi-archive-1252644" },
 ],
 },
 {
 image: "/styling-guide/post-58.jpg",
 items: [
 { label: "Tank", url: "/products/west-village-vintage-1170443" },
 { label: "Bag", url: "/products/montrose-edit-1700647" },
 { label: "Pants", url: "/products/sourced-by-scottie-2494559" },
 { label: "Shoes", url: "/products/sheer-vintage-1858608" },
 ],
 },
 {
 image: "/styling-guide/post-59.jpg",
 items: [
 { label: "Top", url: "/products/mookie-studios-1895087" },
 { label: "Wallet", url: "/products/hachi-archive-1683444" },
 { label: "Shoes", url: "/products/vintage-girlfriend-86350" },
 { label: "Pants", url: "/products/ascensio-vintage-1898266" },
 { label: "Earrings", url: "/products/blodas-choice-23607" },
 ],
 },
];
