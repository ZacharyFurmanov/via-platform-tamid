import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  type DocumentData,
} from "firebase/firestore";
import type { DBProduct } from "./db";
import { getProductById } from "./db";
import { getDb, nowIso, normalizeKey } from "./firebase-db";

const PRODUCT_FAVORITES_COLLECTION = "product_favorites";
const STORE_FAVORITES_COLLECTION = "store_favorites";
const USERS_COLLECTION = "users";

type ProductFavoriteDoc = {
  user_id: string;
  product_id: number;
  created_at: string;
};

type StoreFavoriteDoc = {
  user_id: string;
  store_slug: string;
  created_at: string;
};

export async function initFavoritesTables() {
  // Firestore collections are created implicitly.
}

function productFavoriteDocId(userId: string, productId: number): string {
  return `${userId}__${productId}`;
}

function storeFavoriteDocId(userId: string, storeSlug: string): string {
  return `${userId}__${normalizeKey(storeSlug)}`;
}

export async function toggleProductFavorite(userId: string, productId: number): Promise<boolean> {
  await initFavoritesTables();
  const db = getDb();

  const ref = doc(collection(db, PRODUCT_FAVORITES_COLLECTION), productFavoriteDocId(userId, productId));
  const existing = await getDoc(ref);

  if (existing.exists()) {
    await deleteDoc(ref);
    return false;
  }

  const payload: ProductFavoriteDoc = {
    user_id: userId,
    product_id: productId,
    created_at: nowIso(),
  };
  await setDoc(ref, payload);
  return true;
}

export async function toggleStoreFavorite(userId: string, storeSlug: string): Promise<boolean> {
  await initFavoritesTables();
  const db = getDb();

  const ref = doc(collection(db, STORE_FAVORITES_COLLECTION), storeFavoriteDocId(userId, storeSlug));
  const existing = await getDoc(ref);

  if (existing.exists()) {
    await deleteDoc(ref);
    return false;
  }

  const payload: StoreFavoriteDoc = {
    user_id: userId,
    store_slug: storeSlug,
    created_at: nowIso(),
  };
  await setDoc(ref, payload);
  return true;
}

export async function getUserProductFavoriteIds(userId: string): Promise<number[]> {
  await initFavoritesTables();
  const db = getDb();
  const snaps = await getDocs(collection(db, PRODUCT_FAVORITES_COLLECTION));

  return snaps.docs
    .map((snap) => snap.data() as Partial<ProductFavoriteDoc>)
    .filter((row) => row.user_id === userId && typeof row.product_id === "number")
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
    .map((row) => row.product_id as number);
}

export async function getUserStoreFavoriteIds(userId: string): Promise<string[]> {
  await initFavoritesTables();
  const db = getDb();
  const snaps = await getDocs(collection(db, STORE_FAVORITES_COLLECTION));

  return snaps.docs
    .map((snap) => snap.data() as Partial<StoreFavoriteDoc>)
    .filter((row) => row.user_id === userId && typeof row.store_slug === "string")
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
    .map((row) => row.store_slug as string);
}

export async function getUserFavoritedProducts(userId: string): Promise<DBProduct[]> {
  await initFavoritesTables();

  const favoriteIds = await getUserProductFavoriteIds(userId);
  const products = await Promise.all(favoriteIds.map((id) => getProductById(id)));

  return products.filter((item): item is DBProduct => item !== null);
}

export async function getProductFavoriteCount(productId: number): Promise<number> {
  await initFavoritesTables();
  const db = getDb();
  const snaps = await getDocs(collection(db, PRODUCT_FAVORITES_COLLECTION));

  return snaps.docs
    .map((snap) => snap.data() as Partial<ProductFavoriteDoc>)
    .filter((row) => row.product_id === productId).length;
}

export async function getProductFavoriteCounts(productIds: number[]): Promise<Record<number, number>> {
  if (productIds.length === 0) return {};

  await initFavoritesTables();
  const idSet = new Set(productIds);
  const counts: Record<number, number> = {};

  const db = getDb();
  const snaps = await getDocs(collection(db, PRODUCT_FAVORITES_COLLECTION));

  for (const snap of snaps.docs) {
    const row = snap.data() as Partial<ProductFavoriteDoc>;
    if (typeof row.product_id !== "number") continue;
    if (!idSet.has(row.product_id)) continue;
    counts[row.product_id] = (counts[row.product_id] ?? 0) + 1;
  }

  return counts;
}

export async function getUsersWhoFavoritedProduct(
  productId: number
): Promise<Array<{ user_id: string; email: string; notification_emails_enabled: boolean }>> {
  await initFavoritesTables();
  const db = getDb();

  const favoriteSnaps = await getDocs(collection(db, PRODUCT_FAVORITES_COLLECTION));
  const userIds = favoriteSnaps.docs
    .map((snap) => snap.data() as Partial<ProductFavoriteDoc>)
    .filter((row) => row.product_id === productId && typeof row.user_id === "string")
    .map((row) => row.user_id as string);

  if (userIds.length === 0) return [];

  const uniqueUserIds = Array.from(new Set(userIds));
  const users: Array<{ user_id: string; email: string; notification_emails_enabled: boolean }> = [];

  for (const userId of uniqueUserIds) {
    const userSnap = await getDoc(doc(collection(db, USERS_COLLECTION), userId));
    if (!userSnap.exists()) continue;

    const user = userSnap.data() as DocumentData;
    if (typeof user.email !== "string") continue;

    users.push({
      user_id: userId,
      email: user.email,
      notification_emails_enabled: user.notification_emails_enabled !== false,
    });
  }

  return users;
}
