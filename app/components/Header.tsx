import { getActiveCategories } from "@/app/lib/getActiveCategories";
import { getActiveCollectionSlugs } from "@/app/lib/editors-picks-db";
import HeaderClient from "@/app/components/HeaderClient";

export default async function Header() {
  const [categories, activeCollectionSlugs] = await Promise.all([
    getActiveCategories().catch(() => []),
    getActiveCollectionSlugs().catch(() => new Set<string>()),
  ]);
  return <HeaderClient categories={categories} activeCollectionSlugs={activeCollectionSlugs} />;
}
