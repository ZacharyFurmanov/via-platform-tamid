import { neon } from "@neondatabase/serverless";

// Anonymous buyer cart for hosted storefronts. Keyed by a cart token (cookie) so
// the seller's customers never need a VYA login. Items are one-of-one (qty always
// 1), so a cart is just a set of item ids per token. Item details + availability
// are read live from the inventory engine at view/checkout time.

function db() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("DATABASE_URL or POSTGRES_URL is not set.");
 return neon(url);
}

let ensured = false;
async function ensureTable() {
 if (ensured) return;
 const sql = db();
 await sql`CREATE TABLE IF NOT EXISTS storefront_cart_items (
 cart_token TEXT NOT NULL,
 item_id UUID NOT NULL,
 added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY (cart_token, item_id)
 )`;
 ensured = true;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function addToCart(cartToken: string, itemId: string): Promise<void> {
 await ensureTable();
 await db()`INSERT INTO storefront_cart_items (cart_token, item_id) VALUES (${cartToken}, ${itemId})
 ON CONFLICT (cart_token, item_id) DO NOTHING`;
}

export async function removeFromCart(cartToken: string, itemId: string): Promise<void> {
 await ensureTable();
 await db()`DELETE FROM storefront_cart_items WHERE cart_token = ${cartToken} AND item_id = ${itemId}`;
}

export async function getCartItemIds(cartToken: string): Promise<string[]> {
 await ensureTable();
 const rows = await db()`SELECT item_id FROM storefront_cart_items WHERE cart_token = ${cartToken} ORDER BY added_at`;
 return (rows as any[]).map((r) => r.item_id as string);
}

export async function clearCart(cartToken: string): Promise<void> {
 await ensureTable();
 await db()`DELETE FROM storefront_cart_items WHERE cart_token = ${cartToken}`;
}
