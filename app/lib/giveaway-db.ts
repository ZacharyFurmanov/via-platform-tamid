import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { ensureCounterAtLeast, getDb, nextCounter, nowIso } from "./firebase-db";

const GIVEAWAY_COLLECTION = "giveaway_entries";

export interface GiveawayEntry {
  id: number;
  email: string;
  referralCode: string;
  referredByCode: string | null;
  referralCount: number;
  friend1Email: string | null;
  friend2Email: string | null;
  phone1: string | null;
  phone2: string | null;
  reminderSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ReminderCategory = "no_activity" | "invited_no_entries" | "one_referral";

export interface ReminderCandidate {
  entry: GiveawayEntry;
  category: ReminderCategory;
}

type GiveawayDoc = {
  id: number;
  email: string;
  referral_code: string;
  referred_by_code: string | null;
  referral_count: number;
  friend_1_email: string | null;
  friend_2_email: string | null;
  phone_1: string | null;
  phone_2: string | null;
  reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateReferralCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}

function entryDocId(email: string): string {
  return email.trim().toLowerCase();
}

function mapDoc(row: GiveawayDoc): GiveawayEntry {
  return {
    id: row.id,
    email: row.email,
    referralCode: row.referral_code,
    referredByCode: row.referred_by_code,
    referralCount: row.referral_count,
    friend1Email: row.friend_1_email,
    friend2Email: row.friend_2_email,
    phone1: row.phone_1,
    phone2: row.phone_2,
    reminderSentAt: row.reminder_sent_at ? new Date(row.reminder_sent_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

async function getAllRows(): Promise<GiveawayDoc[]> {
  const db = getDb();
  const snaps = await getDocs(collection(db, GIVEAWAY_COLLECTION));

  return snaps.docs
    .map((snap) => snap.data() as Partial<GiveawayDoc>)
    .filter(
      (row): row is GiveawayDoc =>
        typeof row.id === "number" &&
        typeof row.email === "string" &&
        typeof row.referral_code === "string" &&
        typeof row.referral_count === "number" &&
        typeof row.created_at === "string" &&
        typeof row.updated_at === "string"
    );
}

function referralCountByCode(rows: GiveawayDoc[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const code = row.referred_by_code?.toUpperCase();
    if (!code) continue;
    map.set(code, (map.get(code) ?? 0) + 1);
  }
  return map;
}

async function syncStoredReferralCount(row: GiveawayDoc, realCount: number): Promise<void> {
  if (realCount === row.referral_count) return;

  const db = getDb();
  const ref = doc(collection(db, GIVEAWAY_COLLECTION), entryDocId(row.email));
  await updateDoc(ref, {
    referral_count: realCount,
    updated_at: nowIso(),
  });
}

export async function initGiveawayDatabase() {
  const rows = await getAllRows();
  const maxId = rows.reduce((max, row) => (row.id > max ? row.id : max), 0);
  await ensureCounterAtLeast("giveaway_entries", maxId);
}

export async function createGiveawayEntry(
  email: string,
  referredByCode?: string
): Promise<{ referralCode: string; isExisting: boolean }> {
  await initGiveawayDatabase();
  const db = getDb();

  const normalizedEmail = email.toLowerCase();
  const ref = doc(collection(db, GIVEAWAY_COLLECTION), entryDocId(normalizedEmail));
  const existing = await getDoc(ref);

  if (existing.exists()) {
    const data = existing.data() as GiveawayDoc;
    return { referralCode: data.referral_code, isExisting: true };
  }

  const existingRows = await getAllRows();
  const existingCodes = new Set(existingRows.map((row) => row.referral_code.toUpperCase()));

  let referralCode = generateReferralCode();
  let attempts = 0;
  while (attempts < 10 && existingCodes.has(referralCode.toUpperCase())) {
    referralCode = generateReferralCode();
    attempts += 1;
  }

  if (existingCodes.has(referralCode.toUpperCase())) {
    throw new Error("Failed to generate unique referral code after 10 attempts");
  }

  const id = await nextCounter("giveaway_entries");
  const now = nowIso();

  const payload: GiveawayDoc = {
    id,
    email: normalizedEmail,
    referral_code: referralCode,
    referred_by_code: referredByCode ? referredByCode.toUpperCase() : null,
    referral_count: 0,
    friend_1_email: null,
    friend_2_email: null,
    phone_1: null,
    phone_2: null,
    reminder_sent_at: null,
    created_at: now,
    updated_at: now,
  };

  await setDoc(ref, payload);
  return { referralCode, isExisting: false };
}

export async function getEntryByCode(code: string): Promise<GiveawayEntry | null> {
  await initGiveawayDatabase();

  const upperCode = code.toUpperCase();
  const rows = await getAllRows();
  const row = rows.find((item) => item.referral_code.toUpperCase() === upperCode);
  if (!row) return null;

  const counts = referralCountByCode(rows);
  const realCount = counts.get(upperCode) ?? 0;
  await syncStoredReferralCount(row, realCount);

  return {
    ...mapDoc(row),
    referralCount: realCount,
  };
}

export async function getEntryByEmail(email: string): Promise<GiveawayEntry | null> {
  await initGiveawayDatabase();

  const ref = doc(collection(getDb(), GIVEAWAY_COLLECTION), entryDocId(email));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const row = snap.data() as GiveawayDoc;
  const rows = await getAllRows();
  const counts = referralCountByCode(rows);
  const upperCode = row.referral_code.toUpperCase();
  const realCount = counts.get(upperCode) ?? 0;
  await syncStoredReferralCount(row, realCount);

  return {
    ...mapDoc(row),
    referralCount: realCount,
  };
}

export async function recordPhoneInvites(code: string, phone1: string, phone2: string): Promise<void> {
  await initGiveawayDatabase();
  const rows = await getAllRows();
  const row = rows.find((item) => item.referral_code.toUpperCase() === code.toUpperCase());
  if (!row) return;

  const ref = doc(collection(getDb(), GIVEAWAY_COLLECTION), entryDocId(row.email));
  await updateDoc(ref, {
    phone_1: phone1,
    phone_2: phone2,
    updated_at: nowIso(),
  });
}

export async function processReferralEntry(
  newEmail: string,
  referrerCode: string
): Promise<{ referrerEntry: GiveawayEntry; friendNumber: 1 | 2 | null } | null> {
  await initGiveawayDatabase();

  const upperCode = referrerCode.toUpperCase();
  const lowerEmail = newEmail.toLowerCase();
  const rows = await getAllRows();

  const referrer = rows.find((row) => row.referral_code.toUpperCase() === upperCode);
  if (!referrer) return null;

  const counts = referralCountByCode(rows);
  const realCount = counts.get(upperCode) ?? 0;

  if (realCount <= referrer.referral_count) {
    return {
      referrerEntry: {
        ...mapDoc(referrer),
        referralCount: realCount,
      },
      friendNumber: null,
    };
  }

  const friend1 = referrer.friend_1_email ?? lowerEmail;
  const friend2 = referrer.friend_1_email && !referrer.friend_2_email ? lowerEmail : referrer.friend_2_email;

  const ref = doc(collection(getDb(), GIVEAWAY_COLLECTION), entryDocId(referrer.email));
  await updateDoc(ref, {
    referral_count: realCount,
    friend_1_email: friend1,
    friend_2_email: friend2,
    updated_at: nowIso(),
  });

  const updated: GiveawayDoc = {
    ...referrer,
    referral_count: realCount,
    friend_1_email: friend1,
    friend_2_email: friend2,
    updated_at: nowIso(),
  };

  const friendNumber = realCount === 1 ? 1 : realCount === 2 ? 2 : null;
  return {
    referrerEntry: mapDoc(updated),
    friendNumber,
  };
}

export async function setReferredByCode(email: string, refCode: string): Promise<void> {
  await initGiveawayDatabase();

  const normalizedEmail = email.toLowerCase();
  const ref = doc(collection(getDb(), GIVEAWAY_COLLECTION), entryDocId(normalizedEmail));
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const row = snap.data() as GiveawayDoc;
  if (row.referred_by_code) return;

  await updateDoc(ref, {
    referred_by_code: refCode.toUpperCase(),
    updated_at: nowIso(),
  });
}

export async function getReminderCandidates(): Promise<ReminderCandidate[]> {
  await initGiveawayDatabase();

  const rows = await getAllRows();
  const counts = referralCountByCode(rows);
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

  const candidates: ReminderCandidate[] = [];

  for (const row of rows) {
    const realCount = counts.get(row.referral_code.toUpperCase()) ?? 0;

    if (realCount >= 2) continue;
    if (row.reminder_sent_at) continue;
    if (row.updated_at > twoDaysAgo) continue;

    const category: ReminderCategory =
      realCount === 0
        ? row.phone_1
          ? "invited_no_entries"
          : "no_activity"
        : "one_referral";

    candidates.push({
      entry: {
        ...mapDoc(row),
        referralCount: realCount,
      },
      category,
    });
  }

  return candidates;
}

export async function getReminderStats(): Promise<{
  total: number;
  completed: number;
  alreadyReminded: number;
  tooRecent: number;
  eligible: number;
}> {
  await initGiveawayDatabase();

  const rows = await getAllRows();
  const counts = referralCountByCode(rows);
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

  let completed = 0;
  let alreadyReminded = 0;
  let tooRecent = 0;
  let eligible = 0;

  for (const row of rows) {
    const realCount = counts.get(row.referral_code.toUpperCase()) ?? 0;

    if (realCount >= 2) {
      completed += 1;
      continue;
    }

    if (row.reminder_sent_at) {
      alreadyReminded += 1;
      continue;
    }

    if (row.updated_at > twoDaysAgo) {
      tooRecent += 1;
      continue;
    }

    eligible += 1;
  }

  return {
    total: rows.length,
    completed,
    alreadyReminded,
    tooRecent,
    eligible,
  };
}

export async function markReminderSent(id: number): Promise<void> {
  await initGiveawayDatabase();

  const rows = await getAllRows();
  const row = rows.find((item) => item.id === id);
  if (!row) return;

  const ref = doc(collection(getDb(), GIVEAWAY_COLLECTION), entryDocId(row.email));
  await updateDoc(ref, {
    reminder_sent_at: nowIso(),
    updated_at: nowIso(),
  });
}
