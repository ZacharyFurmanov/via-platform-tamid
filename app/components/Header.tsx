import { getActiveCategories } from "@/app/lib/getActiveCategories";
import { getActiveCollectionSlugs } from "@/app/lib/editors-picks-db";
import { getActiveBrands } from "@/app/lib/getActiveBrands";
import HeaderClient from "@/app/components/HeaderClient";

export default async function Header() {
 const [categories, activeCollectionSlugs, allBrands] = await Promise.all([
 getActiveCategories().catch(() => []),
 getActiveCollectionSlugs().catch(() => new Set<string>()),
 getActiveBrands().catch(() => []),
 ]);

 // Every active designer (those with inventory), sorted by product count.
 // The nav drawer scrolls, so the full list is fine here.
 const topDesigners = allBrands.map((b) => ({ slug: b.slug, label: b.label }));

 return <HeaderClient categories={categories} activeCollectionSlugs={activeCollectionSlugs} topDesigners={topDesigners} />;
}
