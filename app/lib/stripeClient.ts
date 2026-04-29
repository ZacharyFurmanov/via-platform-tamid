export type StripeProduct = {
  title: string;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  images: string[];
  externalUrl: string;
  description: string | null;
  variantId: string | null;
};

export type StripeResult = {
  products: StripeProduct[];
  skippedCount: number;
};

export async function fetchStripeProducts(
  secretKeyEnvVar: string,
  storeWebsiteUrl: string,
): Promise<StripeResult> {
  const secretKey = process.env[secretKeyEnvVar];
  if (!secretKey) throw new Error(`${secretKeyEnvVar} env var not set`);

  const baseUrl = storeWebsiteUrl.replace(/\/$/, "");
  const headers = {
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  // Fetch all active products
  const productMap = new Map<string, { name: string; description: string | null; images: string[]; metadata: Record<string, string> }>();
  let productStartingAfter: string | undefined;
  do {
    const params = new URLSearchParams({ active: "true", limit: "100" });
    if (productStartingAfter) params.set("starting_after", productStartingAfter);
    const res = await fetch(`https://api.stripe.com/v1/products?${params}`, { headers });
    if (!res.ok) throw new Error(`Stripe Products API ${res.status}: ${await res.text()}`);
    const data = await res.json() as { data: StripeProdObject[]; has_more: boolean };
    for (const p of data.data) {
      productMap.set(p.id, {
        name: p.name,
        description: p.description ?? null,
        images: p.images ?? [],
        metadata: p.metadata ?? {},
      });
    }
    productStartingAfter = data.has_more ? data.data[data.data.length - 1]?.id : undefined;
  } while (productStartingAfter);

  // Fetch all active one-time prices
  const pricesByProduct = new Map<string, { id: string; unit_amount: number; currency: string }[]>();
  let priceStartingAfter: string | undefined;
  do {
    const params = new URLSearchParams({ active: "true", limit: "100", type: "one_time" });
    if (priceStartingAfter) params.set("starting_after", priceStartingAfter);
    const res = await fetch(`https://api.stripe.com/v1/prices?${params}`, { headers });
    if (!res.ok) throw new Error(`Stripe Prices API ${res.status}: ${await res.text()}`);
    const data = await res.json() as { data: StripePriceObject[]; has_more: boolean };
    for (const price of data.data) {
      if (!price.unit_amount || price.unit_amount <= 0) continue;
      const list = pricesByProduct.get(price.product) ?? [];
      list.push({ id: price.id, unit_amount: price.unit_amount, currency: price.currency });
      pricesByProduct.set(price.product, list);
    }
    priceStartingAfter = data.has_more ? data.data[data.data.length - 1]?.id : undefined;
  } while (priceStartingAfter);

  const products: StripeProduct[] = [];
  let skippedCount = 0;

  for (const [productId, prod] of productMap) {
    const prices = pricesByProduct.get(productId);
    if (!prices || prices.length === 0) { skippedCount++; continue; }

    // Use the lowest active price
    const price = prices.sort((a, b) => a.unit_amount - b.unit_amount)[0];
    const priceUsd = price.unit_amount / 100;

    // External URL: prefer metadata.url, fall back to /products/{id} on their site
    const externalUrl = prod.metadata.url || prod.metadata.product_url || `${baseUrl}/products/${productId}`;

    products.push({
      title: prod.name,
      price: priceUsd,
      compareAtPrice: null,
      image: prod.images[0] ?? null,
      images: prod.images,
      externalUrl,
      description: prod.description,
      variantId: price.id, // use price ID as the variant identifier
    });
  }

  return { products, skippedCount };
}

type StripeProdObject = {
  id: string;
  name: string;
  description?: string;
  images?: string[];
  metadata?: Record<string, string>;
};

type StripePriceObject = {
  id: string;
  product: string;
  unit_amount: number | null;
  currency: string;
};
