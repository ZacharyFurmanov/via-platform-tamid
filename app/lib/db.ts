import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  deleteDoc,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { ensureCounterAtLeast, getDb, nextCounter, nowIso, productDocId, toDate, toIso } from "./firebase-db";

const PRODUCTS_COLLECTION = "products";

export type DBProduct = {
  id: number;
  store_slug: string;
  store_name: string;
  title: string;
  price: number;
  currency: string;
  image: string | null;
  images: string | null;
  external_url: string | null;
  description: string | null;
  variant_id: string | null;
  shopify_product_id: string | null;
  collabs_link: string | null;
  size: string | null;
  insider_notified: boolean;
  synced_at: Date;
  created_at: Date | null;
};

type ProductDoc = {
  id: number;
  store_slug: string;
  store_name: string;
  title: string;
  price: number;
  currency: string;
  image: string | null;
  images: string | null;
  external_url: string | null;
  description: string | null;
  variant_id: string | null;
  shopify_product_id: string | null;
  collabs_link: string | null;
  size: string | null;
  insider_notified: boolean;
  synced_at: string;
  created_at: string | null;
};

function mapSnapshot(snap: QueryDocumentSnapshot<DocumentData>): DBProduct {
  const data = snap.data() as Partial<ProductDoc>;
  return {
    id: Number(data.id ?? 0),
    store_slug: String(data.store_slug ?? ""),
    store_name: String(data.store_name ?? ""),
    title: String(data.title ?? ""),
    price: Number(data.price ?? 0),
    currency: String(data.currency ?? "USD"),
    image: data.image ?? null,
    images: data.images ?? null,
    external_url: data.external_url ?? null,
    description: data.description ?? null,
    variant_id: data.variant_id ?? null,
    shopify_product_id: data.shopify_product_id ?? null,
    collabs_link: data.collabs_link ?? null,
    size: data.size ?? null,
    insider_notified: data.insider_notified === true,
    synced_at: toDate(data.synced_at) ?? new Date(0),
    created_at: toDate(data.created_at),
  };
}

async function getAllProductDocs(): Promise<DBProduct[]> {
  const db = getDb();
  const snaps = await getDocs(collection(db, PRODUCTS_COLLECTION));
  return snaps.docs.map(mapSnapshot);
}

function isVisibleToPublic(product: DBProduct, now = Date.now()): boolean {
  const hasCollabsRequirement = !!product.shopify_product_id && !product.collabs_link;
  if (hasCollabsRequirement) return false;

  if (!product.created_at) return true;
  return product.created_at.getTime() <= now - 24 * 60 * 60 * 1000;
}

function isVisibleRegardlessOfWindow(product: DBProduct): boolean {
  return !(product.shopify_product_id && !product.collabs_link);
}

function sortByCreatedDesc(a: DBProduct, b: DBProduct): number {
  const aTime = a.created_at?.getTime() ?? 0;
  const bTime = b.created_at?.getTime() ?? 0;
  return bTime - aTime;
}

export async function initDatabase() {
  const products = await getAllProductDocs();
  const maxId = products.reduce((max, p) => (p.id > max ? p.id : max), 0);
  await ensureCounterAtLeast("products", maxId);
}

export async function syncProducts(
  storeSlug: string,
  storeName: string,
  products: Array<{
    title: string;
    price: number;
    currency?: string;
    image?: string;
    images?: string[];
    externalUrl?: string;
    description?: string;
    variantId?: string;
    shopifyProductId?: string;
    size?: string;
  }>
) {
  const db = getDb();
  const now = nowIso();

  const all = await getAllProductDocs();
  const existingForStore = all.filter((p) => p.store_slug === storeSlug);
  const existingByTitle = new Map(existingForStore.map((p) => [p.title, p]));
  const isExistingStore = existingForStore.length > 0;

  const incomingTitles = new Set(products.map((p) => p.title));

  for (const product of products) {
    const existing = existingByTitle.get(product.title);
    const id = existing?.id ?? (await nextCounter("products"));
    const createdAt = existing?.created_at
      ? existing.created_at.toISOString()
      : isExistingStore
        ? now
        : null;

    const payload: ProductDoc = {
      id,
      store_slug: storeSlug,
      store_name: storeName,
      title: product.title,
      price: Number(product.price),
      currency: product.currency || "USD",
      image: product.image || null,
      images: product.images ? JSON.stringify(product.images) : null,
      external_url: product.externalUrl || null,
      description: product.description || null,
      variant_id: product.variantId || existing?.variant_id || null,
      shopify_product_id: product.shopifyProductId || existing?.shopify_product_id || null,
      collabs_link: existing?.collabs_link || null,
      size: product.size || existing?.size || null,
      insider_notified: existing?.insider_notified === true,
      synced_at: now,
      created_at: createdAt,
    };

    const ref = doc(collection(db, PRODUCTS_COLLECTION), productDocId(storeSlug, product.title));
    await setDoc(ref, payload);
  }

  for (const existing of existingForStore) {
    if (incomingTitles.has(existing.title)) continue;
    const ref = doc(collection(db, PRODUCTS_COLLECTION), productDocId(existing.store_slug, existing.title));
    await deleteDoc(ref);
  }

  return products.length;
}

export async function getProductsByStore(storeSlug: string): Promise<DBProduct[]> {
  const now = Date.now();
  const all = await getAllProductDocs();
  return all
    .filter((p) => p.store_slug === storeSlug)
    .filter((p) => isVisibleToPublic(p, now))
    .sort((a, b) => a.id - b.id);
}

export async function getProductById(id: number): Promise<DBProduct | null> {
  const db = getDb();
  const snaps = await getDocs(query(collection(db, PRODUCTS_COLLECTION), where("id", "==", id)));
  const first = snaps.docs[0];
  return first ? mapSnapshot(first) : null;
}

export async function getAllProducts(isMember: boolean = false): Promise<DBProduct[]> {
  const now = Date.now();
  const all = await getAllProductDocs();
  return all
    .filter((p) => (isMember ? isVisibleRegardlessOfWindow(p) : isVisibleToPublic(p, now)))
    .sort((a, b) => {
      if (a.store_slug === b.store_slug) return a.id - b.id;
      return a.store_slug.localeCompare(b.store_slug);
    });
}

export async function getRecommendedProducts(
  excludeId: number,
  limit: number = 20
): Promise<DBProduct[]> {
  const now = Date.now();
  const all = await getAllProductDocs();
  const filtered = all.filter((p) => p.id !== excludeId).filter((p) => isVisibleToPublic(p, now));
  return filtered.sort(() => Math.random() - 0.5).slice(0, limit);
}

export async function getNewArrivals(
  limit: number = 12,
  days: number = 7,
  isMember: boolean = false
): Promise<DBProduct[]> {
  const now = Date.now();
  const oldest = now - days * 24 * 60 * 60 * 1000;
  const windowStart = now - 24 * 60 * 60 * 1000;

  const all = await getAllProductDocs();
  const arrivals = all
    .filter((p) => isVisibleRegardlessOfWindow(p))
    .filter((p) => !!p.created_at)
    .filter((p) => {
      const ts = p.created_at?.getTime() ?? 0;
      if (ts < oldest) return false;
      if (!isMember && ts > windowStart) return false;
      return true;
    })
    .sort(sortByCreatedDesc)
    .slice(0, limit);

  if (arrivals.length > 0) return arrivals;

  return all
    .filter((p) => isVisibleRegardlessOfWindow(p))
    .sort(() => Math.random() - 0.5)
    .slice(0, limit);
}

export async function getInsiderProducts(limit: number = 48): Promise<DBProduct[]> {
  const now = Date.now();
  const since = now - 24 * 60 * 60 * 1000;
  const all = await getAllProductDocs();

  return all
    .filter((p) => isVisibleRegardlessOfWindow(p))
    .filter((p) => !!p.created_at)
    .filter((p) => (p.created_at?.getTime() ?? 0) >= since)
    .sort(sortByCreatedDesc)
    .slice(0, limit);
}

export async function getUnnotifiedInsiderProducts(limit: number = 50): Promise<DBProduct[]> {
  const all = await getAllProductDocs();
  return all
    .filter((p) => isVisibleRegardlessOfWindow(p))
    .filter((p) => !!p.created_at)
    .filter((p) => !p.insider_notified)
    .sort(sortByCreatedDesc)
    .slice(0, limit);
}

export async function markProductsAsInsiderNotified(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const db = getDb();

  const all = await getAllProductDocs();
  const byId = new Map(all.map((p) => [p.id, p]));

  for (const id of ids) {
    const product = byId.get(id);
    if (!product) continue;
    const ref = doc(collection(db, PRODUCTS_COLLECTION), productDocId(product.store_slug, product.title));
    await updateDoc(ref, { insider_notified: true, synced_at: nowIso() });
  }
}

export async function getSyncedStores(): Promise<
  Array<{ store_slug: string; store_name: string; product_count: number; last_synced: Date }>
> {
  const all = await getAllProductDocs();
  const grouped = new Map<string, { store_slug: string; store_name: string; product_count: number; last: number }>();

  for (const product of all) {
    const key = `${product.store_slug}__${product.store_name}`;
    const last = product.synced_at.getTime();
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, {
        store_slug: product.store_slug,
        store_name: product.store_name,
        product_count: 1,
        last,
      });
      continue;
    }

    current.product_count += 1;
    if (last > current.last) current.last = last;
  }

  return Array.from(grouped.values())
    .map((row) => ({
      store_slug: row.store_slug,
      store_name: row.store_name,
      product_count: row.product_count,
      last_synced: new Date(row.last),
    }))
    .sort((a, b) => a.store_name.localeCompare(b.store_name));
}

export async function updateCollabsLink(id: number, collabsLink: string): Promise<void> {
  const db = getDb();
  const product = await getProductById(id);
  if (!product) return;

  const ref = doc(collection(db, PRODUCTS_COLLECTION), productDocId(product.store_slug, product.title));
  await updateDoc(ref, { collabs_link: collabsLink, synced_at: nowIso() });
}

export async function getProductsMissingCollabsLink(storeSlug?: string): Promise<DBProduct[]> {
  const all = await getAllProductDocs();
  return all
    .filter((p) => !!p.shopify_product_id)
    .filter((p) => !p.collabs_link)
    .filter((p) => (storeSlug ? p.store_slug === storeSlug : true))
    .sort((a, b) => {
      if (a.store_slug === b.store_slug) return a.id - b.id;
      return a.store_slug.localeCompare(b.store_slug);
    });
}

export async function getCollabsLink(id: number): Promise<string | null> {
  const product = await getProductById(id);
  return product?.collabs_link ?? null;
}

export async function getShopifyIdCoverage(
  storeSlugs: string[]
): Promise<Record<string, { total: number; withId: number; withoutId: number; withCollabsLink: number }>> {
  if (storeSlugs.length === 0) return {};

  const set = new Set(storeSlugs);
  const all = await getAllProductDocs();
  const result: Record<string, { total: number; withId: number; withoutId: number; withCollabsLink: number }> = {};

  for (const product of all) {
    if (!set.has(product.store_slug)) continue;

    if (!result[product.store_slug]) {
      result[product.store_slug] = {
        total: 0,
        withId: 0,
        withoutId: 0,
        withCollabsLink: 0,
      };
    }

    result[product.store_slug].total += 1;
    if (product.shopify_product_id) {
      result[product.store_slug].withId += 1;
    } else {
      result[product.store_slug].withoutId += 1;
    }
    if (product.collabs_link) {
      result[product.store_slug].withCollabsLink += 1;
    }
  }

  return result;
}

export async function getAnyCollabsLinkForStore(storeSlug: string): Promise<string | null> {
  const all = await getAllProductDocs();
  const product = all.find((p) => p.store_slug === storeSlug && !!p.collabs_link);
  return product?.collabs_link ?? null;
}

export async function getProductsWithCollabsLinks(storeSlug?: string, limit = 5): Promise<DBProduct[]> {
  const all = await getAllProductDocs();
  return all
    .filter((p) => !!p.collabs_link)
    .filter((p) => (storeSlug ? p.store_slug === storeSlug : true))
    .sort((a, b) => {
      if (a.store_slug === b.store_slug) return a.id - b.id;
      return a.store_slug.localeCompare(b.store_slug);
    })
    .slice(0, limit);
}

export async function updateCollabsLinkByShopifyProductId(
  shopifyProductId: string,
  collabsLink: string
): Promise<void> {
  const db = getDb();
  const snaps = await getDocs(
    query(collection(db, PRODUCTS_COLLECTION), where("shopify_product_id", "==", shopifyProductId))
  );

  for (const snap of snaps.docs) {
    await updateDoc(snap.ref, { collabs_link: collabsLink, synced_at: nowIso() });
  }
}

export function serializeProduct(product: DBProduct): ProductDoc {
  return {
    id: product.id,
    store_slug: product.store_slug,
    store_name: product.store_name,
    title: product.title,
    price: product.price,
    currency: product.currency,
    image: product.image,
    images: product.images,
    external_url: product.external_url,
    description: product.description,
    variant_id: product.variant_id,
    shopify_product_id: product.shopify_product_id,
    collabs_link: product.collabs_link,
    size: product.size,
    insider_notified: product.insider_notified,
    synced_at: toIso(product.synced_at) ?? nowIso(),
    created_at: toIso(product.created_at),
  };
}
