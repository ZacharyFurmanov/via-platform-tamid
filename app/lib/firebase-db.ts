import {
  collection,
  doc,
  getDoc,
  runTransaction,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";

const COUNTERS_COLLECTION = "_meta_counters";

export function getDb(): Firestore {
  return getFirebaseDb();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === "object" && value !== null) {
    const maybeTimestamp = value as { toDate?: () => Date };
    if (typeof maybeTimestamp.toDate === "function") {
      try {
        return maybeTimestamp.toDate();
      } catch {
        return null;
      }
    }
  }

  return null;
}

export function toIso(value: unknown): string | null {
  const date = toDate(value);
  return date ? date.toISOString() : null;
}

export async function nextCounter(name: string): Promise<number> {
  const db = getDb();
  const counterRef = doc(collection(db, COUNTERS_COLLECTION), name);

  let nextValue = 1;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists() ? Number(snap.data().value ?? 0) : 0;
    nextValue = current + 1;
    tx.set(counterRef, { value: nextValue });
  });

  return nextValue;
}

export async function ensureCounterAtLeast(name: string, minimumValue: number): Promise<void> {
  const db = getDb();
  const counterRef = doc(collection(db, COUNTERS_COLLECTION), name);
  const snap = await getDoc(counterRef);
  const current = snap.exists() ? Number(snap.data().value ?? 0) : 0;
  if (current >= minimumValue) return;
  await setDoc(counterRef, { value: minimumValue });
}

export function normalizeKey(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function productDocId(storeSlug: string, title: string): string {
  const base = normalizeKey(title) || "item";
  return `${normalizeKey(storeSlug)}__${base}`;
}
