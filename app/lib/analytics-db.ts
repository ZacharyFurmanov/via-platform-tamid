import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { getDb, nowIso, toIso } from "./firebase-db";
import { getProductFavoriteCounts } from "./favorites-db";

const CLICKS_COLLECTION = "clicks";
const CONVERSIONS_COLLECTION = "conversions";
const PRODUCT_VIEWS_COLLECTION = "product_views";
const PRODUCTS_COLLECTION = "products";
const USERS_COLLECTION = "users";

export async function initAnalyticsTables() {
  // Firestore collections are created implicitly on first write.
}

export type ClickRecord = {
  clickId: string;
  timestamp: string;
  productId: string;
  productName: string;
  store: string;
  storeSlug: string;
  externalUrl: string;
  userAgent?: string;
  userId?: string | null;
};

type ClickDoc = {
  click_id: string;
  timestamp: string;
  product_id: string;
  product_name: string;
  store: string;
  store_slug: string;
  external_url: string;
  user_agent?: string;
  user_id?: string | null;
};

function mapClickDoc(data: Partial<ClickDoc>): ClickRecord {
  return {
    clickId: data.click_id || "",
    timestamp: data.timestamp || new Date(0).toISOString(),
    productId: data.product_id || "unknown",
    productName: data.product_name || "unknown",
    store: data.store || "unknown",
    storeSlug: data.store_slug || "unknown",
    externalUrl: data.external_url || "",
    userAgent: data.user_agent,
    userId: typeof data.user_id === "string" ? data.user_id : null,
  };
}

export async function saveClick(click: ClickRecord): Promise<void> {
  const db = getDb();
  const ref = doc(collection(db, CLICKS_COLLECTION), click.clickId);
  const existing = await getDoc(ref);
  if (existing.exists()) return;

  const payload: ClickDoc = {
    click_id: click.clickId,
    timestamp: click.timestamp || nowIso(),
    product_id: click.productId,
    product_name: click.productName,
    store: click.store,
    store_slug: click.storeSlug,
    external_url: click.externalUrl,
    user_agent: click.userAgent,
    user_id: click.userId ?? null,
  };

  await setDoc(ref, payload);
}

export async function getClickByClickId(clickId: string): Promise<ClickRecord | null> {
  const db = getDb();
  const snap = await getDoc(doc(collection(db, CLICKS_COLLECTION), clickId));
  if (!snap.exists()) return null;
  return mapClickDoc(snap.data() as Partial<ClickDoc>);
}

function rangeCutoff(range: string): string | null {
  if (range === "7d") {
    return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  if (range === "30d") {
    return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  return null;
}

async function getAllClicks(): Promise<ClickRecord[]> {
  const db = getDb();
  const snaps = await getDocs(collection(db, CLICKS_COLLECTION));
  return snaps.docs.map((snap) => mapClickDoc(snap.data() as Partial<ClickDoc>));
}

export async function getMostRecentClickForStore(
  storeSlug: string,
  sinceIso?: string
): Promise<ClickRecord | null> {
  const clicks = await getAllClicks();
  const filtered = clicks
    .filter((click) => click.storeSlug === storeSlug)
    .filter((click) => (sinceIso ? click.timestamp >= sinceIso : true))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return filtered[0] ?? null;
}

export async function getClickAnalytics(range: string) {
  const cutoff = rangeCutoff(range);
  const clicks = await getAllClicks();
  const filtered = cutoff ? clicks.filter((c) => c.timestamp >= cutoff) : clicks;

  const totalClicks = filtered.length;

  const clicksByStore: Record<string, number> = {};
  for (const click of filtered) {
    clicksByStore[click.store] = (clicksByStore[click.store] ?? 0) + 1;
  }

  const topKeyCounts = new Map<string, { id: string; name: string; store: string; count: number }>();
  for (const click of filtered) {
    const key = `${click.productId}__${click.store}`;
    const existing = topKeyCounts.get(key);
    if (!existing) {
      topKeyCounts.set(key, {
        id: click.productId,
        name: click.productName,
        store: click.store,
        count: 1,
      });
      continue;
    }
    existing.count += 1;
  }

  const topProducts = Array.from(topKeyCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const recentClicks = [...filtered]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 50);

  return { totalClicks, clicksByStore, topProducts, recentClicks, range };
}

export type ConversionRecord = {
  conversionId: string;
  timestamp: string;
  orderId: string;
  orderTotal: number;
  currency: string;
  items: ConversionItem[];
  viaClickId: string | null;
  storeSlug: string;
  storeName: string;
  matched: boolean;
  userId?: string | null;
  matchedClickData?: {
    clickId: string;
    clickTimestamp: string;
    productName: string;
  };
};

type ConversionItem = {
  productId?: string;
  productName: string;
  quantity: number;
  price: number;
};

type ConversionDoc = {
  conversion_id: string;
  timestamp: string;
  order_id: string;
  order_total: number;
  currency: string;
  items: ConversionItem[];
  via_click_id: string | null;
  store_slug: string;
  store_name: string;
  matched: boolean;
  user_id?: string | null;
  matched_click_data?: ConversionRecord["matchedClickData"];
};

function mapConversionDoc(data: Partial<ConversionDoc>): ConversionRecord {
  return {
    conversionId: data.conversion_id || "",
    timestamp: data.timestamp || new Date(0).toISOString(),
    orderId: data.order_id || "",
    orderTotal: Number(data.order_total ?? 0),
    currency: data.currency || "USD",
    items: data.items || [],
    viaClickId: data.via_click_id ?? null,
    storeSlug: data.store_slug || "",
    storeName: data.store_name || "",
    matched: data.matched === true,
    userId: typeof data.user_id === "string" ? data.user_id : null,
    matchedClickData: data.matched_click_data,
  };
}

async function getAllConversions(): Promise<ConversionRecord[]> {
  const db = getDb();
  const snaps = await getDocs(collection(db, CONVERSIONS_COLLECTION));
  return snaps.docs.map((snap) => mapConversionDoc(snap.data() as Partial<ConversionDoc>));
}

export async function saveConversion(conversion: ConversionRecord): Promise<{ duplicate: boolean }> {
  const db = getDb();
  const existing = await getAllConversions();
  const duplicate = existing.some(
    (item) => item.orderId === conversion.orderId && item.storeSlug === conversion.storeSlug
  );
  if (duplicate) return { duplicate: true };

  const payload: ConversionDoc = {
    conversion_id: conversion.conversionId,
    timestamp: conversion.timestamp || nowIso(),
    order_id: conversion.orderId,
    order_total: conversion.orderTotal,
    currency: conversion.currency,
    items: conversion.items,
    via_click_id: conversion.viaClickId,
    store_slug: conversion.storeSlug,
    store_name: conversion.storeName,
    matched: conversion.matched,
    user_id: conversion.userId ?? null,
    matched_click_data: conversion.matchedClickData,
  };

  await setDoc(doc(collection(db, CONVERSIONS_COLLECTION), conversion.conversionId), payload);
  return { duplicate: false };
}

export async function getConversionAnalytics(range: string) {
  const cutoff = rangeCutoff(range);
  const conversions = await getAllConversions();
  const filtered = cutoff ? conversions.filter((c) => c.timestamp >= cutoff) : conversions;

  const totalConversions = filtered.length;
  const matchedConversions = filtered.filter((c) => c.matched).length;
  const totalRevenue = filtered.reduce((sum, c) => sum + c.orderTotal, 0);
  const matchedRevenue = filtered
    .filter((c) => c.matched)
    .reduce((sum, c) => sum + c.orderTotal, 0);

  const revenueByStore: Record<string, { total: number; matched: number; count: number }> = {};
  for (const conv of filtered) {
    if (!revenueByStore[conv.storeName]) {
      revenueByStore[conv.storeName] = { total: 0, matched: 0, count: 0 };
    }

    revenueByStore[conv.storeName].total += conv.orderTotal;
    revenueByStore[conv.storeName].count += 1;
    if (conv.matched) {
      revenueByStore[conv.storeName].matched += conv.orderTotal;
    }
  }

  const recentConversions = [...filtered]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 20);

  return {
    totalConversions,
    matchedConversions,
    totalRevenue,
    matchedRevenue,
    revenueByStore,
    recentConversions,
    range,
  };
}

export async function saveProductView(productId: string): Promise<void> {
  const db = getDb();
  await addDoc(collection(db, PRODUCT_VIEWS_COLLECTION), {
    product_id: productId,
    timestamp: nowIso(),
  });
}

type ProductDoc = {
  id: number;
  store_slug: string;
  price?: number;
};

type ProductViewDoc = {
  product_id: string;
  timestamp: string;
};

function numberValue(input: unknown): number {
  const value = Number(input);
  return Number.isFinite(value) ? value : 0;
}

function commissionForPrice(price: number): number {
  if (price < 1000) return price * 0.07;
  if (price < 5000) return price * 0.05;
  return price * 0.03;
}

export async function getProductPopularityScores(
  dbIds: number[]
): Promise<Record<number, number>> {
  if (dbIds.length === 0) return {};

  const db = getDb();
  const ids = new Set(dbIds);

  const productSnaps = await getDocs(collection(db, PRODUCTS_COLLECTION));
  const productRows = productSnaps.docs
    .map((snap) => snap.data() as Partial<ProductDoc>)
    .filter((row): row is ProductDoc => typeof row.id === "number" && typeof row.store_slug === "string")
    .filter((row) => ids.has(row.id));

  const compositeIdMap = new Map<string, number>();
  for (const row of productRows) {
    const compositeId = `${row.store_slug}-${row.id}`;
    compositeIdMap.set(compositeId, row.id);
  }

  const compositeIds = new Set(compositeIdMap.keys());
  if (compositeIds.size === 0) return {};

  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [clicks, favCounts, conversions, views] = await Promise.all([
    getAllClicks(),
    getProductFavoriteCounts(dbIds),
    getAllConversions(),
    getDocs(collection(db, PRODUCT_VIEWS_COLLECTION)),
  ]);

  const scores: Record<number, number> = {};

  for (const click of clicks) {
    if (!compositeIds.has(click.productId)) continue;

    const dbId = compositeIdMap.get(click.productId);
    if (dbId == null) continue;

    let weight = 1;
    if (click.timestamp >= sevenDaysAgo) {
      weight = 3;
    } else if (click.timestamp >= thirtyDaysAgo) {
      weight = 2;
    }

    scores[dbId] = (scores[dbId] ?? 0) + weight;
  }

  for (const [dbId, count] of Object.entries(favCounts)) {
    const id = Number(dbId);
    scores[id] = (scores[id] ?? 0) + count * 3;
  }

  for (const conversion of conversions) {
    if (conversion.timestamp < ninetyDaysAgo) continue;

    for (const item of conversion.items) {
      const productId = item.productId;
      if (!productId || !compositeIds.has(productId)) continue;

      const dbId = compositeIdMap.get(productId);
      if (dbId == null) continue;
      scores[dbId] = (scores[dbId] ?? 0) + 5;
    }
  }

  for (const snap of views.docs) {
    const view = snap.data() as Partial<ProductViewDoc>;
    if (!view.product_id || !compositeIds.has(view.product_id)) continue;

    const dbId = compositeIdMap.get(view.product_id);
    if (dbId == null) continue;

    let weight = 0;
    const ts = view.timestamp || toIso(new Date(0)) || new Date(0).toISOString();
    if (ts >= sevenDaysAgo) {
      weight = 2;
    } else if (ts >= thirtyDaysAgo) {
      weight = 1;
    }

    scores[dbId] = (scores[dbId] ?? 0) + weight;
  }

  return scores;
}

type UserDoc = {
  email?: string;
  name?: string | null;
};

export type CustomerSummary = {
  userId: string;
  email: string | null;
  name: string | null;
  clickCount: number;
  purchaseCount: number;
  totalSpend: number;
  lastSeen: string;
  firstSeen: string;
};

function resolveConversionUserId(
  conversion: ConversionRecord,
  clickUserById: Map<string, string>
): string | null {
  if (conversion.userId) return conversion.userId;
  if (conversion.viaClickId) return clickUserById.get(conversion.viaClickId) ?? null;
  return null;
}

export async function getUserClickHistory(userId: string): Promise<ClickRecord[]> {
  const clicks = await getAllClicks();
  return clicks
    .filter((click) => click.userId === userId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export async function getUserPurchaseHistory(userId: string): Promise<ConversionRecord[]> {
  const [clicks, conversions] = await Promise.all([getAllClicks(), getAllConversions()]);
  const clickUserById = new Map<string, string>();

  for (const click of clicks) {
    if (!click.userId) continue;
    clickUserById.set(click.clickId, click.userId);
  }

  return conversions
    .filter((conversion) => resolveConversionUserId(conversion, clickUserById) === userId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export async function getCustomerSummaries(): Promise<CustomerSummary[]> {
  const db = getDb();
  const [clicks, conversions, userSnaps] = await Promise.all([
    getAllClicks(),
    getAllConversions(),
    getDocs(collection(db, USERS_COLLECTION)),
  ]);

  const usersById = new Map<string, UserDoc>();
  for (const snap of userSnaps.docs) {
    usersById.set(snap.id, snap.data() as UserDoc);
  }

  const clickUserById = new Map<string, string>();
  for (const click of clicks) {
    if (!click.userId) continue;
    clickUserById.set(click.clickId, click.userId);
  }

  const summaries = new Map<string, CustomerSummary>();

  for (const click of clicks) {
    if (!click.userId) continue;

    const existing = summaries.get(click.userId);
    if (!existing) {
      const user = usersById.get(click.userId);
      summaries.set(click.userId, {
        userId: click.userId,
        email: user?.email ?? null,
        name: user?.name ?? null,
        clickCount: 1,
        purchaseCount: 0,
        totalSpend: 0,
        firstSeen: click.timestamp,
        lastSeen: click.timestamp,
      });
      continue;
    }

    existing.clickCount += 1;
    if (click.timestamp < existing.firstSeen) existing.firstSeen = click.timestamp;
    if (click.timestamp > existing.lastSeen) existing.lastSeen = click.timestamp;
  }

  for (const conversion of conversions) {
    const userId = resolveConversionUserId(conversion, clickUserById);
    if (!userId) continue;

    const existing = summaries.get(userId);
    if (!existing) {
      const user = usersById.get(userId);
      summaries.set(userId, {
        userId,
        email: user?.email ?? null,
        name: user?.name ?? null,
        clickCount: 0,
        purchaseCount: 1,
        totalSpend: numberValue(conversion.orderTotal),
        firstSeen: conversion.timestamp,
        lastSeen: conversion.timestamp,
      });
      continue;
    }

    existing.purchaseCount += 1;
    existing.totalSpend += numberValue(conversion.orderTotal);
    if (conversion.timestamp < existing.firstSeen) existing.firstSeen = conversion.timestamp;
    if (conversion.timestamp > existing.lastSeen) existing.lastSeen = conversion.timestamp;
  }

  return Array.from(summaries.values()).sort((a, b) => {
    if (b.purchaseCount !== a.purchaseCount) return b.purchaseCount - a.purchaseCount;
    if (b.totalSpend !== a.totalSpend) return b.totalSpend - a.totalSpend;
    return b.clickCount - a.clickCount;
  });
}

export async function getInventoryStats(): Promise<{
  productCount: number;
  inventoryValue: number;
  potentialCommission: number;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  byStore: Array<{
    storeSlug: string;
    productCount: number;
    inventoryValue: number;
    potentialCommission: number;
  }>;
}> {
  const db = getDb();
  const snaps = await getDocs(collection(db, PRODUCTS_COLLECTION));

  let productCount = 0;
  let inventoryValue = 0;
  let potentialCommission = 0;
  let tier1Count = 0;
  let tier2Count = 0;
  let tier3Count = 0;

  const byStoreMap = new Map<string, { productCount: number; inventoryValue: number; potentialCommission: number }>();

  for (const snap of snaps.docs) {
    const row = snap.data() as Partial<ProductDoc>;
    const storeSlug = typeof row.store_slug === "string" && row.store_slug ? row.store_slug : "unknown";
    const price = numberValue(row.price);

    productCount += 1;
    inventoryValue += price;

    const commission = commissionForPrice(price);
    potentialCommission += commission;

    if (price < 1000) {
      tier1Count += 1;
    } else if (price < 5000) {
      tier2Count += 1;
    } else {
      tier3Count += 1;
    }

    const existing = byStoreMap.get(storeSlug) || {
      productCount: 0,
      inventoryValue: 0,
      potentialCommission: 0,
    };

    existing.productCount += 1;
    existing.inventoryValue += price;
    existing.potentialCommission += commission;

    byStoreMap.set(storeSlug, existing);
  }

  const byStore = Array.from(byStoreMap.entries())
    .map(([storeSlug, totals]) => ({
      storeSlug,
      productCount: totals.productCount,
      inventoryValue: Math.round(totals.inventoryValue),
      potentialCommission: Math.round(totals.potentialCommission),
    }))
    .sort((a, b) => b.inventoryValue - a.inventoryValue);

  return {
    productCount,
    inventoryValue: Math.round(inventoryValue),
    potentialCommission: Math.round(potentialCommission),
    tier1Count,
    tier2Count,
    tier3Count,
    byStore,
  };
}

export async function getStoreAnalytics(storeSlug: string, range: string) {
  const cutoff = rangeCutoff(range);

  const [clicks, conversions] = await Promise.all([getAllClicks(), getAllConversions()]);

  const storeClicks = clicks
    .filter((c) => c.storeSlug === storeSlug)
    .filter((c) => (cutoff ? c.timestamp >= cutoff : true));

  const totalClicks = storeClicks.length;

  const topMap = new Map<string, number>();
  for (const click of storeClicks) {
    topMap.set(click.productName, (topMap.get(click.productName) ?? 0) + 1);
  }

  const topProducts = Array.from(topMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const recentClicks = [...storeClicks]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 20);

  const storeConversions = conversions
    .filter((c) => c.storeSlug === storeSlug)
    .filter((c) => (cutoff ? c.timestamp >= cutoff : true))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const totalConversions = storeConversions.length;
  const totalRevenue = storeConversions.reduce((sum, c) => sum + c.orderTotal, 0);
  const recentConversions = storeConversions.slice(0, 20);

  return {
    totalClicks,
    totalConversions,
    totalRevenue,
    topProducts,
    recentClicks,
    recentConversions,
    range,
  };
}
