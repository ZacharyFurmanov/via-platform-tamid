import { getActiveCategories } from "@/app/lib/getActiveCategories";
import { getActiveBrands } from "@/app/lib/getActiveBrands";
import HeaderClient from "@/app/components/HeaderClient";

export default async function Header() {
  const [categories, activeBrands] = await Promise.all([
    getActiveCategories(),
    getActiveBrands(),
  ]);
  const brands = activeBrands.map((b) => ({ slug: b.slug, label: b.label }));
  return <HeaderClient categories={categories} brands={brands} />;
}
