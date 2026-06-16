import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/app/lib/base-url";
import { saveSetting, getSetting } from "@/app/lib/settings-db";
import crypto from "crypto";

function isAuthorized(request: NextRequest): boolean {
 const adminPassword = process.env.ADMIN_PASSWORD;
 if (!adminPassword) return false;
 const authHeader = request.headers.get("authorization");
 if (authHeader === `Bearer ${adminPassword}`) return true;
 const token = request.cookies.get("via_admin_token")?.value;
 return !!token && token === crypto.createHash("sha256").update(adminPassword).digest("hex");
}

const BASE_URL = getBaseUrl();

/** Save the Shopify webhook signing secret for a specific store */
export async function POST(request: NextRequest) {
 if (!isAuthorized(request)) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 const { storeSlug, webhookSecret } = await request.json();
 if (!storeSlug || !webhookSecret) {
 return NextResponse.json({ error: "storeSlug and webhookSecret are required" }, { status: 400 });
 }

 await saveSetting(`shopify_webhook_secret_${storeSlug}`, webhookSecret.trim());

 return NextResponse.json({
 ok: true,
 storeSlug,
 webhookUrl: `${BASE_URL}/api/webhooks/shopify?store=${storeSlug}`,
 });
}

/** Get the current webhook secret (masked) and URL for a store */
export async function GET(request: NextRequest) {
 if (!isAuthorized(request)) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 const { searchParams } = new URL(request.url);
 const storeSlug = searchParams.get("store");
 if (!storeSlug) {
 return NextResponse.json({ error: "store param required" }, { status: 400 });
 }

 const secret = await getSetting(`shopify_webhook_secret_${storeSlug}`);

 return NextResponse.json({
 storeSlug,
 webhookUrl: `${BASE_URL}/api/webhooks/shopify?store=${storeSlug}`,
 secretConfigured: !!secret,
 secretPreview: secret ? `${secret.slice(0, 6)}...${secret.slice(-4)}` : null,
 });
}
