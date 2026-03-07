import { addDoc, collection, getDocs } from "firebase/firestore";
import { getDb, nowIso } from "./firebase-db";

const PRODUCT_FAVORITES_COLLECTION = "product_favorites";
const USERS_COLLECTION = "users";
const PRODUCTS_COLLECTION = "products";
const CLICKS_COLLECTION = "clicks";
const FAVORITE_NOTIFICATIONS_COLLECTION = "favorite_notifications";

type ProductFavoriteDoc = {
  user_id: string;
  product_id: number;
  created_at: string;
};

type UserDoc = {
  email?: string;
  notification_emails_enabled?: boolean;
};

type ProductDoc = {
  id: number;
  title: string;
  image: string | null;
  store_name: string;
  store_slug: string;
};

type ClickDoc = {
  product_id: string;
  timestamp: string;
};

type FavoriteNotificationDoc = {
  user_id: string;
  product_id: number;
  sent_at: string;
  click_count_at_send: number;
};

export async function initNotificationTables() {
  // Firestore collections are created implicitly.
}

export type NotificationCandidate = {
  user_id: string;
  email: string;
  product_id: number;
  product_title: string;
  product_image: string | null;
  store_name: string;
  store_slug: string;
  recent_click_count: number;
};

export async function getFavoriteNotificationCandidates(): Promise<NotificationCandidate[]> {
  await initNotificationTables();
  const db = getDb();

  const [favoriteSnaps, userSnaps, productSnaps, clickSnaps, notifSnaps] = await Promise.all([
    getDocs(collection(db, PRODUCT_FAVORITES_COLLECTION)),
    getDocs(collection(db, USERS_COLLECTION)),
    getDocs(collection(db, PRODUCTS_COLLECTION)),
    getDocs(collection(db, CLICKS_COLLECTION)),
    getDocs(collection(db, FAVORITE_NOTIFICATIONS_COLLECTION)),
  ]);

  const favorites = favoriteSnaps.docs
    .map((snap) => snap.data() as Partial<ProductFavoriteDoc>)
    .filter(
      (row): row is ProductFavoriteDoc =>
        typeof row.user_id === "string" &&
        typeof row.product_id === "number" &&
        typeof row.created_at === "string"
    );

  const users = new Map(
    userSnaps.docs.map((snap) => [snap.id, snap.data() as UserDoc])
  );

  const products = new Map<number, ProductDoc>();
  for (const snap of productSnaps.docs) {
    const row = snap.data() as Partial<ProductDoc>;
    if (
      typeof row.id === "number" &&
      typeof row.title === "string" &&
      typeof row.store_name === "string" &&
      typeof row.store_slug === "string"
    ) {
      products.set(row.id, {
        id: row.id,
        title: row.title,
        image: row.image ?? null,
        store_name: row.store_name,
        store_slug: row.store_slug,
      });
    }
  }

  const clicks = clickSnaps.docs
    .map((snap) => snap.data() as Partial<ClickDoc>)
    .filter(
      (row): row is ClickDoc =>
        typeof row.product_id === "string" && typeof row.timestamp === "string"
    );

  const notifications = notifSnaps.docs
    .map((snap) => snap.data() as Partial<FavoriteNotificationDoc>)
    .filter(
      (row): row is FavoriteNotificationDoc =>
        typeof row.user_id === "string" &&
        typeof row.product_id === "number" &&
        typeof row.sent_at === "string" &&
        typeof row.click_count_at_send === "number"
    );

  const latestSent = new Map<string, string>();
  for (const notif of notifications) {
    const key = `${notif.user_id}__${notif.product_id}`;
    const current = latestSent.get(key);
    if (!current || notif.sent_at > current) {
      latestSent.set(key, notif.sent_at);
    }
  }

  const candidates: NotificationCandidate[] = [];

  for (const favorite of favorites) {
    const user = users.get(favorite.user_id);
    if (!user) continue;
    if (user.notification_emails_enabled === false) continue;
    if (typeof user.email !== "string") continue;

    const product = products.get(favorite.product_id);
    if (!product) continue;

    const since = latestSent.get(`${favorite.user_id}__${favorite.product_id}`) || favorite.created_at;
    const compositeId = `${product.store_slug}-${product.id}`;

    const recentClickCount = clicks.filter(
      (click) => click.product_id === compositeId && click.timestamp > since
    ).length;

    if (recentClickCount < 3) continue;

    candidates.push({
      user_id: favorite.user_id,
      email: user.email,
      product_id: product.id,
      product_title: product.title,
      product_image: product.image,
      store_name: product.store_name,
      store_slug: product.store_slug,
      recent_click_count: recentClickCount,
    });
  }

  return candidates;
}

export async function recordNotificationSent(
  userId: string,
  productId: number,
  clickCount: number
): Promise<void> {
  await initNotificationTables();
  const db = getDb();

  await addDoc(collection(db, FAVORITE_NOTIFICATIONS_COLLECTION), {
    user_id: userId,
    product_id: productId,
    sent_at: nowIso(),
    click_count_at_send: clickCount,
  } satisfies FavoriteNotificationDoc);
}

export async function getNotificationsSentTodayCount(userId: string): Promise<number> {
  await initNotificationTables();
  const db = getDb();

  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const startIso = start.toISOString();

  const snaps = await getDocs(collection(db, FAVORITE_NOTIFICATIONS_COLLECTION));
  return snaps.docs
    .map((snap) => snap.data() as Partial<FavoriteNotificationDoc>)
    .filter((row) => row.user_id === userId)
    .filter((row) => typeof row.sent_at === "string" && row.sent_at >= startIso).length;
}
