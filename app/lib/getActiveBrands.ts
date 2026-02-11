import { getInventory } from "@/app/lib/inventory";
import { brandMap } from "@/app/lib/brandData";

type ActiveBrand = {
  slug: string;
  label: string;
  productCount: number;
};

export async function getActiveBrands(): Promise<ActiveBrand[]> {
  const items = await getInventory();

  const brandCounts = new Map<string, number>();
  for (const item of items) {
    if (item.brand) {
      brandCounts.set(item.brand, (brandCounts.get(item.brand) ?? 0) + 1);
    }
  }

  return Array.from(brandCounts.entries())
    .map(([slug, count]) => ({
      slug,
      label: brandMap[slug] ?? slug,
      productCount: count,
    }))
    .sort((a, b) => b.productCount - a.productCount);
}
