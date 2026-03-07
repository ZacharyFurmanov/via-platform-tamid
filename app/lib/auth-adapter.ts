import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type { Adapter, AdapterAccount, AdapterUser } from "next-auth/adapters";
import { getDb, nowIso, toDate } from "./firebase-db";

const USERS_COLLECTION = "users";
const ACCOUNTS_COLLECTION = "auth_accounts";
const VERIFICATION_TOKENS_COLLECTION = "verification_tokens";

type UserDoc = {
  name: string | null;
  email: string;
  email_verified: string | null;
  image: string | null;
  notification_emails_enabled: boolean;
  phone: string | null;
  is_member: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  member_since: string | null;
  created_at: string;
  updated_at: string;
};

type AccountDoc = {
  user_id: string;
  type: string;
  provider: string;
  provider_account_id: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
};

type VerificationTokenDoc = {
  identifier: string;
  token: string;
  expires: string;
};

export async function initAuthTables() {
  // Firestore collections are created implicitly.
}

let tablesInitialized = false;
async function ensureTables() {
  if (!tablesInitialized) {
    await initAuthTables();
    tablesInitialized = true;
  }
}

function accountDocId(provider: string, providerAccountId: string): string {
  return `${provider}__${providerAccountId}`;
}

function mapUser(id: string, row: Partial<UserDoc>): AdapterUser {
  return {
    id,
    name: row.name ?? null,
    email: row.email ?? "",
    emailVerified: toDate(row.email_verified),
    image: row.image ?? null,
  };
}

export const firebaseAdapter: Adapter = {
  async createUser(user) {
    await ensureTables();
    const db = getDb();

    const id = user.id || crypto.randomUUID();
    const now = nowIso();

    const payload: UserDoc = {
      name: user.name ?? null,
      email: user.email,
      email_verified: user.emailVerified ? user.emailVerified.toISOString() : null,
      image: user.image ?? null,
      notification_emails_enabled: true,
      phone: null,
      is_member: false,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      member_since: null,
      created_at: now,
      updated_at: now,
    };

    await setDoc(doc(collection(db, USERS_COLLECTION), id), payload, { merge: true });
    return mapUser(id, payload);
  },

  async getUser(id) {
    await ensureTables();
    const db = getDb();
    const snap = await getDoc(doc(collection(db, USERS_COLLECTION), id));
    if (!snap.exists()) return null;

    return mapUser(snap.id, snap.data() as Partial<UserDoc>);
  },

  async getUserByEmail(email) {
    await ensureTables();
    const db = getDb();
    const normalized = email.toLowerCase();

    const snaps = await getDocs(collection(db, USERS_COLLECTION));
    for (const snap of snaps.docs) {
      const row = snap.data() as Partial<UserDoc>;
      if (typeof row.email !== "string") continue;
      if (row.email.toLowerCase() !== normalized) continue;
      return mapUser(snap.id, row);
    }

    return null;
  },

  async getUserByAccount({ provider, providerAccountId }) {
    await ensureTables();
    const db = getDb();

    const accountSnap = await getDoc(
      doc(collection(db, ACCOUNTS_COLLECTION), accountDocId(provider, providerAccountId))
    );
    if (!accountSnap.exists()) return null;

    const account = accountSnap.data() as Partial<AccountDoc>;
    if (!account.user_id) return null;

    const userSnap = await getDoc(doc(collection(db, USERS_COLLECTION), account.user_id));
    if (!userSnap.exists()) return null;

    return mapUser(userSnap.id, userSnap.data() as Partial<UserDoc>);
  },

  async updateUser(user) {
    await ensureTables();
    const db = getDb();

    if (!user.id) {
      throw new Error("updateUser requires a user id");
    }

    const ref = doc(collection(db, USERS_COLLECTION), user.id);
    const patch: Partial<UserDoc> = {
      updated_at: nowIso(),
    };

    if (user.name !== undefined) patch.name = user.name;
    if (user.email !== undefined) patch.email = user.email;
    if (user.emailVerified !== undefined) {
      patch.email_verified = user.emailVerified ? user.emailVerified.toISOString() : null;
    }
    if (user.image !== undefined) patch.image = user.image;

    await setDoc(ref, patch, { merge: true });

    const updated = await getDoc(ref);
    if (!updated.exists()) {
      throw new Error("Failed to update user");
    }

    return mapUser(updated.id, updated.data() as Partial<UserDoc>);
  },

  async linkAccount(account) {
    await ensureTables();
    const db = getDb();

    const payload: AccountDoc = {
      user_id: account.userId,
      type: account.type,
      provider: account.provider,
      provider_account_id: account.providerAccountId,
      refresh_token: account.refresh_token ?? null,
      access_token: account.access_token ?? null,
      expires_at: account.expires_at ?? null,
      token_type: account.token_type ?? null,
      scope: account.scope ?? null,
      id_token: account.id_token ?? null,
    };

    await setDoc(
      doc(collection(db, ACCOUNTS_COLLECTION), accountDocId(account.provider, account.providerAccountId)),
      payload
    );

    return account as AdapterAccount;
  },

  async createVerificationToken(token) {
    await ensureTables();
    const db = getDb();

    const payload: VerificationTokenDoc = {
      identifier: token.identifier,
      token: token.token,
      expires: token.expires.toISOString(),
    };

    await setDoc(doc(collection(db, VERIFICATION_TOKENS_COLLECTION), token.token), payload);
    return {
      identifier: payload.identifier,
      token: payload.token,
      expires: new Date(payload.expires),
    };
  },

  async useVerificationToken({ identifier, token }) {
    await ensureTables();
    const db = getDb();

    const ref = doc(collection(db, VERIFICATION_TOKENS_COLLECTION), token);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const row = snap.data() as Partial<VerificationTokenDoc>;
    if (row.identifier !== identifier || !row.expires || !row.token) {
      await deleteDoc(ref);
      return null;
    }

    await deleteDoc(ref);
    return {
      identifier: row.identifier,
      token: row.token,
      expires: new Date(row.expires),
    };
  },

  async deleteUser(userId) {
    await ensureTables();
    const db = getDb();
    await deleteDoc(doc(collection(db, USERS_COLLECTION), userId));

    const accountSnaps = await getDocs(collection(db, ACCOUNTS_COLLECTION));
    for (const accountSnap of accountSnaps.docs) {
      const row = accountSnap.data() as Partial<AccountDoc>;
      if (row.user_id !== userId) continue;
      await deleteDoc(accountSnap.ref);
    }
  },

  async unlinkAccount({ provider, providerAccountId }) {
    await ensureTables();
    const db = getDb();
    await deleteDoc(doc(collection(db, ACCOUNTS_COLLECTION), accountDocId(provider, providerAccountId)));
  },
};
