export type SquareProduct = {
  title: string;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  images: string[];
  externalUrl: string;
  description: string | null;
  size: string | null;
  variantId: string | null;
};

export type SquareResult = {
  products: SquareProduct[];
  skippedCount: number;
};

// Fetch inventory counts from Square and return a set of sold-out variant IDs.
// Only marks a variant as sold out when inventory tracking is enabled AND quantity = 0.
// If a variant has no count entry (tracking disabled), it's kept as available.
async function fetchSoldOutVariantIds(
  variantIds: string[],
  locationId: string | undefined,
  accessToken: string,
): Promise<Set<string>> {
  const soldOut = new Set<string>();
  if (variantIds.length === 0) return soldOut;

  const CHUNK = 500;
  for (let i = 0; i < variantIds.length; i += CHUNK) {
    const chunk = variantIds.slice(i, i + CHUNK);
    const body: Record<string, unknown> = { catalog_object_ids: chunk };
    if (locationId) body.location_ids = [locationId];

    const res = await fetch("https://connect.squareup.com/v2/inventory/batch-retrieve-counts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Square-Version": "2024-01-18",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.warn(`[square-inventory] error ${res.status} — skipping inventory filter`);
      continue;
    }

    const data = await res.json() as {
      counts?: Array<{ catalog_object_id: string; state: string; quantity?: string }>;
    };

    for (const count of data.counts ?? []) {
      if (count.state === "IN_STOCK" && parseFloat(count.quantity ?? "1") <= 0) {
        soldOut.add(count.catalog_object_id);
      }
    }
  }

  return soldOut;
}

export async function fetchSquareProducts(
  locationId: string | undefined,
  storeName: string,
  storeWebsiteUrl: string,
  accessTokenEnvVar?: string,
): Promise<SquareResult> {
  const envVar = accessTokenEnvVar ?? "SQUARE_ACCESS_TOKEN";
  const accessToken = process.env[envVar];
  if (!accessToken) throw new Error(`${envVar} env var not set`);

  const candidates: SquareProduct[] = [];
  let skippedCount = 0;
  let cursor: string | undefined;

  do {
    // Omit location_ids from catalog search — it can exclude newly-added items
    // that haven't been explicitly linked to a location yet. We rely on ecom_uri
    // to confirm the item exists on the online store, and inventory counts (below)
    // to filter sold-out items per location.
    const body: Record<string, unknown> = {
      object_types: ["ITEM"],
      include_related_objects: true,
    };
    if (cursor) body.cursor = cursor;

    const res = await fetch("https://connect.squareup.com/v2/catalog/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Square-Version": "2024-01-18",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Square API error ${res.status}: ${err}`);
    }

    const data = await res.json() as {
      objects?: SquareCatalogObject[];
      related_objects?: SquareCatalogObject[];
      cursor?: string;
    };

    const relatedMap = new Map<string, SquareCatalogObject>();
    for (const obj of data.related_objects ?? []) {
      relatedMap.set(obj.id, obj);
    }

    for (const item of data.objects ?? []) {
      if (item.type !== "ITEM" || !item.item_data) continue;

      // Skip archived catalog items
      if (item.is_archived) { skippedCount++; continue; }

      const itemData = item.item_data;
      const title = itemData.name;
      if (!title) { skippedCount++; continue; }

      // Skip items hidden from the Square Online storefront
      if (itemData.ecom_visibility === "HIDDEN") { skippedCount++; continue; }

      // Skip gift cards
      if (title.toLowerCase().includes("gift card")) { skippedCount++; continue; }

      // Only include items published on the Square Online store (ecom_uri present)
      const ecomUri = itemData.ecom_uri;
      if (!ecomUri) { skippedCount++; continue; }

      // Images
      const images: string[] = [];
      for (const imgId of itemData.image_ids ?? []) {
        const imgObj = relatedMap.get(imgId);
        if (imgObj?.image_data?.url) images.push(imgObj.image_data.url);
      }
      const image = images[0] ?? null;

      // Variants
      for (const variant of itemData.variations ?? []) {
        if (variant.type !== "ITEM_VARIATION" || !variant.item_variation_data) continue;

        const vData = variant.item_variation_data;
        const priceMoney = vData.price_money;
        if (!priceMoney) { skippedCount++; continue; }

        // Skip variants marked sold out at this location via Square Online's sold_out flag
        if (locationId && vData.location_overrides?.some(
          (lo) => lo.location_id === locationId && lo.sold_out
        )) { skippedCount++; continue; }

        const priceUsd = priceMoney.amount / 100;
        if (priceUsd <= 0) { skippedCount++; continue; }

        const variantName = vData.name ?? "";
        const fullTitle = variantName && variantName.toLowerCase() !== "regular"
          ? `${title} — ${variantName}`
          : title;

        const size = variantName && variantName.toLowerCase() !== "regular" ? variantName : null;

        candidates.push({
          title: fullTitle,
          price: priceUsd,
          compareAtPrice: null,
          image,
          images,
          externalUrl: ecomUri,
          description: itemData.description ?? null,
          size,
          variantId: variant.id,
        });
      }
    }

    cursor = data.cursor;
  } while (cursor);

  // Filter sold-out variants using Square inventory counts
  const variantIds = candidates.map((p) => p.variantId).filter((id): id is string => id != null);
  const soldOutIds = await fetchSoldOutVariantIds(variantIds, locationId, accessToken);

  const products = candidates.filter((p) => !p.variantId || !soldOutIds.has(p.variantId));
  skippedCount += candidates.length - products.length;

  console.log(`[square-sync] ${storeName}: ${products.length} available, ${skippedCount} skipped (${soldOutIds.size} sold out by inventory)`);

  return { products, skippedCount };
}

type SquareCatalogObject = {
  type: string;
  id: string;
  is_archived?: boolean;
  item_data?: {
    name?: string;
    description?: string;
    image_ids?: string[];
    variations?: SquareCatalogObject[];
    ecom_uri?: string;
    ecom_visibility?: "VISIBLE" | "UNINDEXED" | "HIDDEN" | string;
  };
  item_variation_data?: {
    name?: string;
    price_money?: { amount: number; currency: string };
    location_overrides?: Array<{ location_id: string; sold_out?: boolean }>;
  };
  image_data?: {
    url?: string;
  };
};
