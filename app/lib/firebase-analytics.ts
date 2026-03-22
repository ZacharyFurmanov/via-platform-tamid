"use client";

import { getApps, initializeApp } from "firebase/app";
import {
  type Analytics,
  getAnalytics,
  initializeAnalytics,
  isSupported,
  logEvent,
  setUserId,
  setUserProperties,
} from "firebase/analytics";

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
    "AIzaSyC4vvgBUxOByqdA0GDwfEjwWx4SHoHaF48",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    "via-platform-5482b.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "via-platform-5482b",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    "via-platform-5482b.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "925730480485",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??
    "1:925730480485:web:415f0001e1afa955cdc18c",
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "G-B34GJXKMZ7",
};

export type AnalyticsItemInput = {
  itemId: string;
  itemName: string;
  price?: number | string | null;
  category?: string | null;
  storeName?: string | null;
  storeSlug?: string | null;
  size?: string | null;
  quantity?: number | null;
  listId?: string | null;
  listName?: string | null;
  index?: number | null;
};

type SearchResultsPayload = {
  searchTerm: string;
  resultsCount: number;
  displayedCount?: number;
  storeCount?: number;
  designerCount?: number;
  categoryCount?: number;
  selectedStore?: string | null;
  sort?: string | null;
};

type FilterChangePayload = {
  surface: string;
  resultCount: number;
  search?: string;
  priceRange?: string;
  sort?: string;
  selectedStores?: string[];
  selectedCategories?: string[];
  selectedBrands?: string[];
  selectedSizes?: string[];
  selectedTypes?: string[];
  selectedColors?: string[];
};

let analyticsPromise: Promise<Analytics | null> | null = null;

function isFirebaseConfigured() {
  return Boolean(firebaseConfig.measurementId && firebaseConfig.appId);
}

function getFirebaseApp() {
  return getApps()[0] ?? initializeApp(firebaseConfig);
}

function cleanParams<T extends Record<string, unknown>>(params: T): T {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  ) as T;
}

function parsePrice(value: AnalyticsItemInput["price"]): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }

  return undefined;
}

function sumItemValue(items: AnalyticsItemInput[]) {
  return items.reduce((total, item) => {
    const price = parsePrice(item.price) ?? 0;
    const quantity = item.quantity ?? 1;
    return total + price * quantity;
  }, 0);
}

export function buildAnalyticsItem(item: AnalyticsItemInput) {
  return cleanParams({
    item_id: item.itemId,
    item_name: item.itemName,
    item_category: item.category ?? undefined,
    item_variant: item.size ?? undefined,
    item_list_id: item.listId ?? undefined,
    item_list_name: item.listName ?? undefined,
    index: item.index ?? undefined,
    price: parsePrice(item.price),
    quantity: item.quantity ?? 1,
    store_name: item.storeName ?? undefined,
    store_slug: item.storeSlug ?? undefined,
  });
}

async function getClientAnalytics() {
  if (typeof window === "undefined" || !isFirebaseConfigured()) {
    return null;
  }

  if (!analyticsPromise) {
    analyticsPromise = (async () => {
      const supported = await isSupported().catch(() => false);
      if (!supported) {
        return null;
      }

      const app = getFirebaseApp();

      try {
        return initializeAnalytics(app, {
          config: {
            send_page_view: false,
          },
        });
      } catch {
        return getAnalytics(app);
      }
    })();
  }

  return analyticsPromise;
}

async function trackEvent(eventName: string, params: Record<string, unknown>) {
  const analytics = await getClientAnalytics();
  if (!analytics) {
    return;
  }

  logEvent(analytics, eventName, cleanParams(params));
}

export async function identifyAnalyticsUser(userId: string | null) {
  const analytics = await getClientAnalytics();
  if (!analytics) {
    return;
  }

  setUserId(analytics, userId);
  setUserProperties(
    analytics,
    cleanParams({
      auth_state: userId ? "signed_in" : "guest",
    })
  );
}

export async function trackPageView(pathname: string, search = "") {
  const pagePath = search ? `${pathname}?${search}` : pathname;

  await trackEvent("page_view", {
    page_title: typeof document !== "undefined" ? document.title : undefined,
    page_location: typeof window !== "undefined" ? window.location.href : undefined,
    page_path: pagePath,
  });
}

export async function trackViewItem(item: AnalyticsItemInput, surface?: string) {
  await trackEvent("view_item", {
    currency: "USD",
    value: parsePrice(item.price),
    store_name: item.storeName ?? undefined,
    store_slug: item.storeSlug ?? undefined,
    surface,
    items: [buildAnalyticsItem(item)],
  });
}

export async function trackSelectItem(item: AnalyticsItemInput, surface?: string) {
  await trackEvent("select_item", {
    currency: "USD",
    value: parsePrice(item.price),
    item_list_id: item.listId ?? undefined,
    item_list_name: item.listName ?? undefined,
    store_name: item.storeName ?? undefined,
    store_slug: item.storeSlug ?? undefined,
    surface,
    items: [buildAnalyticsItem(item)],
  });
}

export async function trackViewItemList(
  items: AnalyticsItemInput[],
  options: { listId: string; listName?: string; surface?: string }
) {
  if (items.length === 0) {
    return;
  }

  await trackEvent("view_item_list", {
    item_list_id: options.listId,
    item_list_name: options.listName ?? options.listId,
    surface: options.surface ?? options.listId,
    result_count: items.length,
    items: items.slice(0, 20).map((item, index) =>
      buildAnalyticsItem({
        ...item,
        listId: item.listId ?? options.listId,
        listName: item.listName ?? options.listName ?? options.listId,
        index,
      })
    ),
  });
}

export async function trackAddToCart(item: AnalyticsItemInput, surface?: string) {
  await trackEvent("add_to_cart", {
    currency: "USD",
    value: parsePrice(item.price),
    store_name: item.storeName ?? undefined,
    store_slug: item.storeSlug ?? undefined,
    surface,
    items: [buildAnalyticsItem(item)],
  });
}

export async function trackViewCart(items: AnalyticsItemInput[], surface?: string) {
  if (items.length === 0) {
    return;
  }

  await trackEvent("view_cart", {
    currency: "USD",
    value: sumItemValue(items),
    surface,
    store_count: new Set(items.map((item) => item.storeSlug).filter(Boolean)).size,
    items: items.map((item) => buildAnalyticsItem(item)),
  });
}

export async function trackBeginCheckout(
  items: AnalyticsItemInput[],
  options: { surface: string; checkoutType: string; storeSlug?: string; storeName?: string }
) {
  if (items.length === 0) {
    return;
  }

  await trackEvent("begin_checkout", {
    currency: "USD",
    value: sumItemValue(items),
    surface: options.surface,
    checkout_type: options.checkoutType,
    store_slug: options.storeSlug,
    store_name: options.storeName,
    item_count: items.reduce((count, item) => count + (item.quantity ?? 1), 0),
    items: items.map((item) => buildAnalyticsItem(item)),
  });
}

export async function trackStoreClick(params: {
  storeSlug: string;
  storeName: string;
  surface: string;
  destinationPath: string;
}) {
  await trackEvent("store_click", params);
}

export async function trackStoreView(params: {
  storeSlug: string;
  storeName: string;
  inventoryCount: number;
}) {
  await trackEvent("store_view", {
    store_slug: params.storeSlug,
    store_name: params.storeName,
    inventory_count: params.inventoryCount,
  });
}

export async function trackSearchResults(params: SearchResultsPayload) {
  await trackEvent("view_search_results", {
    search_term: params.searchTerm,
    results_count: params.resultsCount,
    displayed_count: params.displayedCount ?? params.resultsCount,
    matched_store_count: params.storeCount,
    matched_designer_count: params.designerCount,
    matched_category_count: params.categoryCount,
    selected_store: params.selectedStore ?? undefined,
    sort: params.sort ?? undefined,
  });
}

export async function trackFilterChange(params: FilterChangePayload) {
  await trackEvent("inventory_filter_change", {
    surface: params.surface,
    result_count: params.resultCount,
    search_term: params.search?.trim() || undefined,
    price_range: params.priceRange,
    sort: params.sort,
    selected_store_count: params.selectedStores?.length ?? 0,
    selected_category_count: params.selectedCategories?.length ?? 0,
    selected_brand_count: params.selectedBrands?.length ?? 0,
    selected_size_count: params.selectedSizes?.length ?? 0,
    selected_type_count: params.selectedTypes?.length ?? 0,
    selected_color_count: params.selectedColors?.length ?? 0,
    selected_stores: params.selectedStores?.join("|"),
    selected_categories: params.selectedCategories?.join("|"),
    selected_brands: params.selectedBrands?.join("|"),
    selected_sizes: params.selectedSizes?.join("|"),
    selected_types: params.selectedTypes?.join("|"),
    selected_colors: params.selectedColors?.join("|"),
  });
}

export async function trackFavoriteToggle(params: {
  targetType: "product" | "store";
  targetId: string;
  action: "added" | "removed";
}) {
  await trackEvent("favorite_toggle", {
    target_type: params.targetType,
    target_id: params.targetId,
    action: params.action,
  });
}
