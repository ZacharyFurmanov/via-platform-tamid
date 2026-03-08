import { collection, doc, getDoc, setDoc } from "firebase/firestore";
import { getDb, nowIso } from "./firebase-db";

const SETTINGS_COLLECTION = "app_settings";

type SettingDoc = {
  value: string;
  updated_at: string;
};

async function initSettingsTable() {
  // Firestore collections are created implicitly.
}

export async function saveSetting(key: string, value: string): Promise<void> {
  await initSettingsTable();
  const db = getDb();

  const payload: SettingDoc = {
    value,
    updated_at: nowIso(),
  };

  await setDoc(doc(collection(db, SETTINGS_COLLECTION), key), payload, { merge: true });
}

export async function getSetting(key: string): Promise<string | null> {
  await initSettingsTable();
  const db = getDb();
  const snap = await getDoc(doc(collection(db, SETTINGS_COLLECTION), key));
  if (!snap.exists()) return null;

  const row = snap.data() as Partial<SettingDoc>;
  return typeof row.value === "string" ? row.value : null;
}
