import { unstable_cache } from "next/cache";
import { getBrandCounts } from "@/app/lib/db";
import { brandMap } from "@/app/lib/brandData";

type ActiveBrand = {
  slug: string;
  label: string;
  productCount: number;
};

async function _getActiveBrandsUncached(): Promise<ActiveBrand[]> {
  const rows = await getBrandCounts();

  return rows.map(({ brand, count }) => ({
    slug: brand,
    label: brandMap[brand] ?? brand,
    productCount: count,
  }));
}

// Cache the brand list for 30 minutes
export const getActiveBrands = unstable_cache(
  _getActiveBrandsUncached,
  ["active-brands"],
  { revalidate: 1800 }
);
