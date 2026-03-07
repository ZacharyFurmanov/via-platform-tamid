import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { getDb, nowIso } from "./firebase-db";

const USERS_COLLECTION = "users";

type UserDoc = {
  email?: string;
  is_member?: boolean;
  member_since?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
};

export async function initMembershipColumns() {
  // Firestore is schemaless.
}

export async function getUserMembershipStatus(
  userId: string
): Promise<{ isMember: boolean; memberSince: Date | null }> {
  await initMembershipColumns();
  const db = getDb();
  const snap = await getDoc(doc(collection(db, USERS_COLLECTION), userId));

  if (!snap.exists()) {
    return { isMember: false, memberSince: null };
  }

  const user = snap.data() as UserDoc;
  return {
    isMember: user.is_member === true,
    memberSince: user.member_since ? new Date(user.member_since) : null,
  };
}

export async function setMemberActive(
  userId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string
): Promise<void> {
  await initMembershipColumns();
  const db = getDb();
  const ref = doc(collection(db, USERS_COLLECTION), userId);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? (snap.data() as UserDoc) : undefined;

  await setDoc(
    ref,
    {
      is_member: true,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      member_since: existing?.member_since ?? nowIso(),
      updated_at: nowIso(),
    },
    { merge: true }
  );
}

export async function setMemberCancelled(userId: string): Promise<void> {
  await initMembershipColumns();
  const db = getDb();
  await setDoc(
    doc(collection(db, USERS_COLLECTION), userId),
    {
      is_member: false,
      stripe_subscription_id: null,
      updated_at: nowIso(),
    },
    { merge: true }
  );
}

export async function getUserByStripeCustomerId(
  stripeCustomerId: string
): Promise<{ id: string; email: string } | null> {
  await initMembershipColumns();
  const db = getDb();
  const snaps = await getDocs(collection(db, USERS_COLLECTION));

  for (const snap of snaps.docs) {
    const user = snap.data() as UserDoc;
    if (user.stripe_customer_id === stripeCustomerId && typeof user.email === "string") {
      return { id: snap.id, email: user.email };
    }
  }

  return null;
}

export async function getUserByEmail(
  email: string
): Promise<{ id: string; email: string; stripe_customer_id: string | null } | null> {
  await initMembershipColumns();
  const db = getDb();
  const normalized = email.toLowerCase();
  const snaps = await getDocs(collection(db, USERS_COLLECTION));

  for (const snap of snaps.docs) {
    const user = snap.data() as UserDoc;
    if (typeof user.email !== "string") continue;
    if (user.email.toLowerCase() !== normalized) continue;

    return {
      id: snap.id,
      email: user.email,
      stripe_customer_id: user.stripe_customer_id ?? null,
    };
  }

  return null;
}

export async function getInsiderUserEmails(): Promise<string[]> {
  await initMembershipColumns();
  const db = getDb();
  const snaps = await getDocs(collection(db, USERS_COLLECTION));

  return snaps.docs
    .map((snap) => snap.data() as UserDoc)
    .filter((user) => user.is_member === true)
    .map((user) => user.email)
    .filter((email): email is string => typeof email === "string");
}

export async function saveStripeCustomerId(
  userId: string,
  stripeCustomerId: string
): Promise<void> {
  await initMembershipColumns();
  const db = getDb();
  await setDoc(
    doc(collection(db, USERS_COLLECTION), userId),
    {
      stripe_customer_id: stripeCustomerId,
      updated_at: nowIso(),
    },
    { merge: true }
  );
}
