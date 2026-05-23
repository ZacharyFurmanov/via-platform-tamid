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

 const topDesigners = allBrands
 .filter((b) => b.productCount >= 40)
 .slice(0, 10)
 .map((b) => ({ slug: b.slug, label: b.label }));

 return <HeaderClient categories={categories} activeCollectionSlugs={activeCollectionSlugs} topDesigners={topDesigners} />;
}
