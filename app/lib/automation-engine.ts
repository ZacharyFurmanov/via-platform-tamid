import { sendStoreCampaign } from "./email";
import { resolveStoreSender } from "./email-settings-db";
import { getCustomAutomationsForTrigger, isAutomationEnabled } from "./automations-db";
import { listCustomerProfiles } from "./store-customers-db";
import type { AbandonedCart } from "./checkout-attempts-db";

// The recommerce automation engine: turns a store's automation settings + custom
// triggers into actually-sent emails, honoring the on/off toggles and each customer's
// email-subscription status. Sends AS the store (their name + verified domain when set,
// else VYA's shared domain), with replies routed to the store.

// {{name}}, {{item}} … → value.
const fill = (t: string, vars: Record<string, string>) => t.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => vars[k] ?? "");

/**
 * Fire every active custom automation for an event, to one recipient. Used by the
 * per-customer triggers (a new customer, a placed order). Returns emails sent.
 */
export async function fireAutomationTrigger(
 storeSlug: string,
 trigger: string,
 recipient: { email: string; name?: string | null },
 vars: Record<string, string> = {},
): Promise<number> {
 if (!recipient.email || !recipient.email.includes("@")) return 0;
 const autos = await getCustomAutomationsForTrigger(storeSlug, trigger).catch(() => []);
 if (!autos.length) return 0;
 const { fromName, fromAddress, replyTo, website } = await resolveStoreSender(storeSlug);
 if (!replyTo) return 0;
 const v = { name: recipient.name || "there", ...vars };
 let sent = 0;
 for (const a of autos) {
 const r = await sendStoreCampaign({ storeName: fromName, storeEmail: replyTo, fromAddress, subject: fill(a.subject, v), body: fill(a.body, v), link: website, recipients: [recipient.email] }).catch(() => null);
 if (r) sent += r.sent;
 }
 return sent;
}

/**
 * Daily new-listings digest → the store's SUBSCRIBED customers, if the built-in
 * "new arrivals" flow is on OR a custom "new_listing" automation is active. Batched,
 * so a whole drop is one email — never one per publish.
 */
export async function sendNewListingsDigest(storeSlug: string, newItems: { title: string }[]): Promise<{ sent: number } | null> {
 if (!newItems.length) return null;
 const builtinOn = await isAutomationEnabled(storeSlug, "new_arrivals").catch(() => true);
 const custom = await getCustomAutomationsForTrigger(storeSlug, "new_listing").catch(() => []);
 if (!builtinOn && custom.length === 0) return null;

 const { fromName, fromAddress, replyTo, website } = await resolveStoreSender(storeSlug);
 if (!replyTo) return null;
 const profiles = await listCustomerProfiles(storeSlug).catch(() => []);
 const recipients = [...new Set(profiles.filter((c) => c.subscribed && c.email.includes("@")).map((c) => c.email))];
 if (!recipients.length) return null;

 const list = newItems.slice(0, 12).map((i) => `• ${i.title}`).join("\n");
 const subject = custom[0]?.subject?.trim() || `New arrivals from ${fromName}`;
 const intro = custom[0]?.body?.trim() || "Fresh one-of-one pieces just landed. Shop them before they’re gone:";
 const body = `${intro}\n\n${list}`;
 const r = await sendStoreCampaign({ storeName: fromName, storeEmail: replyTo, fromAddress, subject, body, link: website, recipients }).catch(() => null);
 return r ? { sent: r.sent } : null;
}

const CHECKOUT_BASE = "https://vyaplatform.com";

/**
 * Nudge a shopper who opened checkout for a one-of-one piece but didn't finish —
 * only if the store's "abandoned cart" flow is on. A custom "order_placed"-style
 * automation could layer on later; this covers the built-in flow.
 */
export async function sendAbandonedCartEmail(cart: AbandonedCart): Promise<boolean> {
 if (!(await isAutomationEnabled(cart.storeSlug, "abandoned_cart").catch(() => true))) return false;
 if (!cart.email.includes("@")) return false;
 const { fromName, fromAddress, replyTo } = await resolveStoreSender(cart.storeSlug);
 if (!replyTo) return false;
 const piece = cart.itemTitle || "your piece";
 const subject = `Still thinking about ${piece}?`;
 const body = `Hi ${cart.name || "there"},\n\nYou were checking out ${piece} — and since it's one-of-one, once it's gone, it's gone. Come finish up whenever you're ready:`;
 const r = await sendStoreCampaign({ storeName: fromName, storeEmail: replyTo, fromAddress, subject, body, link: `${CHECKOUT_BASE}/checkout?item=${cart.itemId}`, recipients: [cart.email] }).catch(() => null);
 return !!r && r.sent > 0;
}
