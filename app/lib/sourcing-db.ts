import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  setDoc,
} from "firebase/firestore";
import { getDb, nowIso, toIso } from "./firebase-db";

const SOURCING_COLLECTION = "sourcing_requests";

export type SourcingRequest = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  imageUrl: string | null;
  description: string;
  priceMin: number;
  priceMax: number;
  condition: string;
  size: string | null;
  deadline: string;
  stripeSessionId: string | null;
  status: "pending_payment" | "paid" | "matched" | "refunded";
  createdAt: string;
  matchedStoreSlug: string | null;
  matchedStoreAt: string | null;
};

type SourcingRequestDoc = {
  user_id: string;
  user_email: string;
  user_name: string | null;
  image_url: string | null;
  description: string;
  price_min: number;
  price_max: number;
  condition: string;
  size: string | null;
  deadline: string;
  stripe_session_id: string | null;
  status: SourcingRequest["status"];
  created_at: string;
  matched_store_slug: string | null;
  matched_store_at: string | null;
};

async function initSourcingTable(): Promise<void> {
  // Firestore collections are created implicitly.
}

function generateRequestId(): string {
  return `sr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapDoc(id: string, row: Partial<SourcingRequestDoc>): SourcingRequest {
  return {
    id,
    userId: typeof row.user_id === "string" ? row.user_id : "",
    userEmail: typeof row.user_email === "string" ? row.user_email : "",
    userName: toNullableString(row.user_name),
    imageUrl: toNullableString(row.image_url),
    description: typeof row.description === "string" ? row.description : "",
    priceMin: numberValue(row.price_min),
    priceMax: numberValue(row.price_max),
    condition: typeof row.condition === "string" ? row.condition : "",
    size: toNullableString(row.size),
    deadline: typeof row.deadline === "string" ? row.deadline : "",
    stripeSessionId: toNullableString(row.stripe_session_id),
    status: (row.status as SourcingRequest["status"]) || "pending_payment",
    createdAt: toIso(row.created_at) || nowIso(),
    matchedStoreSlug: toNullableString(row.matched_store_slug),
    matchedStoreAt: toIso(row.matched_store_at),
  };
}

async function getAllRows(): Promise<Array<{ id: string; data: SourcingRequestDoc }>> {
  const db = getDb();
  const snaps = await getDocs(collection(db, SOURCING_COLLECTION));

  return snaps.docs
    .map((snap) => ({ id: snap.id, data: snap.data() as Partial<SourcingRequestDoc> }))
    .filter(
      (row): row is { id: string; data: SourcingRequestDoc } =>
        typeof row.data.user_id === "string" &&
        typeof row.data.user_email === "string" &&
        typeof row.data.description === "string" &&
        typeof row.data.condition === "string" &&
        typeof row.data.deadline === "string" &&
        typeof row.data.created_at === "string"
    );
}

export async function createSourcingRequest(data: {
  userId: string;
  userEmail: string;
  userName: string | null;
  imageUrl: string | null;
  description: string;
  priceMin: number;
  priceMax: number;
  condition: string;
  size: string | null;
  deadline: string;
  stripeSessionId: string;
}): Promise<SourcingRequest> {
  await initSourcingTable();
  const db = getDb();

  const id = generateRequestId();
  const payload: SourcingRequestDoc = {
    user_id: data.userId,
    user_email: data.userEmail,
    user_name: data.userName,
    image_url: data.imageUrl,
    description: data.description,
    price_min: Number(data.priceMin),
    price_max: Number(data.priceMax),
    condition: data.condition,
    size: data.size,
    deadline: data.deadline,
    stripe_session_id: data.stripeSessionId,
    status: "pending_payment",
    created_at: nowIso(),
    matched_store_slug: null,
    matched_store_at: null,
  };

  await setDoc(doc(collection(db, SOURCING_COLLECTION), id), payload);
  return mapDoc(id, payload);
}

export async function markSourcingRequestPaid(stripeSessionId: string): Promise<SourcingRequest | null> {
  await initSourcingTable();
  const db = getDb();

  const rows = await getAllRows();
  const target = rows.find(
    (row) =>
      row.data.stripe_session_id === stripeSessionId &&
      row.data.status === "pending_payment"
  );

  if (!target) return null;

  const ref = doc(collection(db, SOURCING_COLLECTION), target.id);
  await setDoc(ref, { status: "paid" }, { merge: true });

  const updated = await getDoc(ref);
  if (!updated.exists()) return null;
  return mapDoc(updated.id, updated.data() as Partial<SourcingRequestDoc>);
}

export async function getSourcingRequestBySession(stripeSessionId: string): Promise<SourcingRequest | null> {
  await initSourcingTable();
  const rows = await getAllRows();
  const row = rows.find((item) => item.data.stripe_session_id === stripeSessionId);
  return row ? mapDoc(row.id, row.data) : null;
}

export async function getSourcingRequestById(id: string, userId: string): Promise<SourcingRequest | null> {
  await initSourcingTable();
  const db = getDb();

  const snap = await getDoc(doc(collection(db, SOURCING_COLLECTION), id));
  if (!snap.exists()) return null;

  const row = snap.data() as Partial<SourcingRequestDoc>;
  if (row.user_id !== userId) return null;
  return mapDoc(snap.id, row);
}

export async function getUserSourcingRequests(userId: string): Promise<SourcingRequest[]> {
  await initSourcingTable();
  const rows = await getAllRows();

  return rows
    .filter((row) => row.data.user_id === userId)
    .sort((a, b) => b.data.created_at.localeCompare(a.data.created_at))
    .map((row) => mapDoc(row.id, row.data));
}

export async function getOpenSourcingRequests(): Promise<SourcingRequest[]> {
  await initSourcingTable();
  const rows = await getAllRows();

  return rows
    .filter((row) => row.data.status === "paid" && !row.data.matched_store_slug)
    .sort((a, b) => a.data.created_at.localeCompare(b.data.created_at))
    .map((row) => mapDoc(row.id, row.data));
}

export async function getSourcingRequestsByStore(storeSlug: string): Promise<SourcingRequest[]> {
  await initSourcingTable();
  const rows = await getAllRows();

  return rows
    .filter((row) => row.data.matched_store_slug === storeSlug)
    .sort((a, b) => (b.data.matched_store_at || "").localeCompare(a.data.matched_store_at || ""))
    .map((row) => mapDoc(row.id, row.data));
}

export async function claimSourcingRequest(
  id: string,
  storeSlug: string
): Promise<{ success: boolean; error?: string }> {
  await initSourcingTable();
  const db = getDb();
  const ref = doc(collection(db, SOURCING_COLLECTION), id);

  let claimed = false;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const row = snap.data() as Partial<SourcingRequestDoc>;
    const canClaim = row.status === "paid" && !row.matched_store_slug;
    if (!canClaim) return;

    claimed = true;
    tx.set(
      ref,
      {
        status: "matched",
        matched_store_slug: storeSlug,
        matched_store_at: nowIso(),
      },
      { merge: true }
    );
  });

  if (!claimed) {
    return { success: false, error: "Already claimed" };
  }

  return { success: true };
}
