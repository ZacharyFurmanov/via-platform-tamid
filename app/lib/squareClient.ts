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

export async function fetchSquareProducts(
  locationId: string | undefined,
  storeName: string,
  storeWebsiteUrl: string,
): Promise<SquareResult> {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  if (!accessToken) throw new Error("SQUARE_ACCESS_TOKEN env var not set");

  const products: SquareProduct[] = [];
  let skippedCount = 0;
  let cursor: string | undefined;

  do {
    const body: Record<string, unknown> = {
      object_types: ["ITEM"],
      include_related_objects: true,
    };
    if (locationId) body.location_ids = [locationId];
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

      const itemData = item.item_data;
      const title = itemData.name;
      if (!title) { skippedCount++; continue; }

      // Skip gift cards
      if (title.toLowerCase().includes("gift card")) { skippedCount++; continue; }

      // Images
      const images: string[] = [];
      for (const imgId of itemData.image_ids ?? []) {
        const imgObj = relatedMap.get(imgId);
        if (imgObj?.image_data?.url) images.push(imgObj.image_data.url);
      }
      const image = images[0] ?? null;

      // Variants
      const variants = itemData.variations ?? [];
      for (const variant of variants) {
        if (variant.type !== "ITEM_VARIATION" || !variant.item_variation_data) continue;

        const vData = variant.item_variation_data;

        // Check inventory / availability
        const priceMoney = vData.price_money;
        if (!priceMoney) { skippedCount++; continue; }

        const priceUsd = priceMoney.amount / 100; // Square stores in cents
        if (priceUsd <= 0) { skippedCount++; continue; }

        const variantName = vData.name ?? "";
        const fullTitle = variantName && variantName.toLowerCase() !== "regular"
          ? `${title} — ${variantName}`
          : title;

        // Size from variant name
        const size = variantName && variantName.toLowerCase() !== "regular" ? variantName : null;

        // External URL: link to store website (Square doesn't give per-product URLs easily)
        const externalUrl = storeWebsiteUrl;

        products.push({
          title: fullTitle,
          price: priceUsd,
          compareAtPrice: null,
          image,
          images,
          externalUrl,
          description: itemData.description ?? null,
          size,
          variantId: variant.id,
        });
      }
    }

    cursor = data.cursor;
  } while (cursor);

  return { products, skippedCount };
}

type SquareCatalogObject = {
  type: string;
  id: string;
  item_data?: {
    name?: string;
    description?: string;
    image_ids?: string[];
    variations?: SquareCatalogObject[];
  };
  item_variation_data?: {
    name?: string;
    price_money?: { amount: number; currency: string };
  };
  image_data?: {
    url?: string;
  };
};
