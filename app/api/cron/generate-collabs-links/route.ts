import { NextResponse } from "next/server";
import {
  getProductsMissingCollabsLink,
  updateCollabsLinkByShopifyProductId,
} from "@/app/lib/db";
import {
  COLLABS_STORES,
  COLLABS_STORE_SLUGS,
  fetchCollabsProducts,
  createAffiliateLink,
} from "@/app/lib/collabs";

// Allow up to 5 minutes for bulk generation
export const maxDuration = 300;

export async function GET(request: Request) {
  console.log("[Generate Collabs Links] Cron job triggered");

  const authHeader = request.headers.get("authorization");

  if (!process.env.CRON_SECRET) {
    console.error("[Generate Collabs Links] CRON_SECRET env var is not set!");
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error("[Generate Collabs Links] Auth failed");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookie = process.env.COLLABS_COOKIE;
  const csrfToken = process.env.COLLABS_CSRF_TOKEN;

  if (!cookie || !csrfToken) {
    const missing = [!cookie && "COLLABS_COOKIE", !csrfToken && "COLLABS_CSRF_TOKEN"]
      .filter(Boolean)
      .join(", ");
    console.error(`[Generate Collabs Links] Missing env vars: ${missing}`);
    return NextResponse.json(
      {
        error: `Missing required environment variables: ${missing}. Set them in Vercel dashboard → Settings → Environment Variables.`,
      },
      { status: 500 }
    );
  }

  // Get all products missing collabs links from VYA's database
  const missingProducts = await getProductsMissingCollabsLink();
  const missingByShopifyId = new Map<string, string>(
    missingProducts
      .filter((p) => p.shopify_product_id && COLLABS_STORE_SLUGS.has(p.store_slug))
      .map((p) => {
        const dbId = p.shopify_product_id!;
        const numericId = dbId.match(/(\d+)$/)?.[1] ?? dbId;
        return [numericId, dbId] as [string, string];
      })
  );

  console.log(
    `[Generate Collabs Links] ${missingByShopifyId.size} products missing links across ${COLLABS_STORES.length} stores`
  );

  let totalSaved = 0;
  let totalCreated = 0;
  let totalFailed = 0;
  let rateLimited = false;
  const storeResults: Array<{
    store: string;
    slug: string;
    saved: number;
    created: number;
    failed: number;
    error?: string;
  }> = [];

  for (const store of COLLABS_STORES) {
    console.log(`[Generate Collabs Links] Processing ${store.name}...`);

    const { products: collabsProducts, error: fetchError } = await fetchCollabsProducts(
      store.collabsStoreId,
      cookie,
      csrfToken
    );

    if (fetchError) {
      console.error(`[Generate Collabs Links] Fetch error for ${store.name}:`, fetchError);
      storeResults.push({ store: store.name, slug: store.slug, saved: 0, created: 0, failed: 0, error: fetchError });
      continue;
    }

    console.log(`[Generate Collabs Links] ${store.name}: ${collabsProducts.length} products from Collabs`);

    let storeSaved = 0;
    let storeCreated = 0;
    let storeFailed = 0;

    for (const product of collabsProducts) {
      const shopifyId = product.shopifyProductId?.match(/(\d+)$/)?.[1];
      const dbShopifyId = shopifyId ? missingByShopifyId.get(shopifyId) : undefined;
      if (!shopifyId || !dbShopifyId) continue;

      let collabsUrl = product.affiliateProduct?.url || null;

      if (!collabsUrl) {
        if (rateLimited) continue;

        const result = await createAffiliateLink(product.id, cookie, csrfToken);
        if (result.url) {
          collabsUrl = result.url;
          storeCreated++;
          totalCreated++;
        } else {
          storeFailed++;
          totalFailed++;
          if (result.error?.includes("Daily links limit")) {
            rateLimited = true;
            console.warn("[Generate Collabs Links] Daily links limit reached — stopping link creation");
          } else {
            console.error(
              `[Generate Collabs Links] Failed to create link for ${product.title}:`,
              result.error
            );
          }
          await new Promise((r) => setTimeout(r, 300));
          continue;
        }
      }

      if (collabsUrl) {
        await updateCollabsLinkByShopifyProductId(dbShopifyId, collabsUrl);
        storeSaved++;
        totalSaved++;
        missingByShopifyId.delete(shopifyId);
        console.log(`[Generate Collabs Links] Saved link for ${product.title} (${store.name})`);
      }

      await new Promise((r) => setTimeout(r, 200));
    }

    storeResults.push({
      store: store.name,
      slug: store.slug,
      saved: storeSaved,
      created: storeCreated,
      failed: storeFailed,
    });
  }

  const summary = {
    success: totalFailed === 0 && !rateLimited,
    storesProcessed: COLLABS_STORES.length,
    linksSaved: totalSaved,
    linksCreated: totalCreated,
    failures: totalFailed,
    rateLimited,
    stores: storeResults,
  };

  console.log("[Generate Collabs Links] Done:", summary);

  return NextResponse.json(summary);
}
