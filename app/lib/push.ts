// ───────────────────────────────────────────────────────────────────────────
// Server-side Expo push delivery. Tokens are collected by the app (customers in
// user_push_tokens, stores in store_push_tokens) — this sends banner pushes to
// them via the Expo Push API. Best-effort: failures never throw to the caller.
// ───────────────────────────────────────────────────────────────────────────

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export type PushPayload = {
 title: string;
 body: string;
 data?: Record<string, unknown>;
};

/** Send a push to many tokens. Filters non-Expo tokens, batches by 100, and
 * swallows errors so a notification failure never breaks a message send. */
export async function sendExpoPush(tokens: string[], payload: PushPayload): Promise<void> {
 const valid = [...new Set(tokens)].filter(
 (t) => t && (t.startsWith("ExponentPushToken[") || t.startsWith("ExpoPushToken[")),
 );
 if (valid.length === 0) return;

 const messages = valid.map((to) => ({
 to,
 title: payload.title,
 body: payload.body,
 data: payload.data ?? {},
 sound: "default",
 }));

 for (let i = 0; i < messages.length; i += 100) {
 const batch = messages.slice(i, i + 100);
 try {
 await fetch(EXPO_PUSH_URL, {
 method: "POST",
 headers: {
 Accept: "application/json",
 "Content-Type": "application/json",
 },
 body: JSON.stringify(batch),
 });
 } catch {
 // best-effort — ignore network/Expo errors
 }
 }
}
