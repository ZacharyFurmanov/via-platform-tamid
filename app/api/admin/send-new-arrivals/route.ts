import { NextRequest, NextResponse } from "next/server";
import {
  getUnnotifiedInsiderProducts,
  markProductsAsInsiderNotified,
  initDatabase,
} from "@/app/lib/db";
import { getInsiderUserEmails, initMembershipColumns } from "@/app/lib/membership-db";
import { sendInsiderNewArrivalsEmail } from "@/app/lib/email";

// Allow up to 5 minutes for bulk sending
export const maxDuration = 300;

function hashPassword(password: string): string {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(password).digest("hex");
}
function isAuthorized(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${adminPassword}`) return true;
  const adminToken = request.cookies.get("via_admin_token")?.value;
  if (adminToken && adminToken === hashPassword(adminPassword)) return true;
  return false;
}

/**
 * POST /api/admin/send-new-arrivals
 *
 * Finds all products that haven't been emailed to Insiders yet,
 * sends a new arrivals email to all active Insider members,
 * then marks those products as notified so they aren't sent again.
 *
 * Optional body: { preview: true } — returns data without sending or marking.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const preview = body?.preview === true;
  const testEmail: string | undefined = body?.testEmail;

  await initDatabase();
  await initMembershipColumns();

  const [products, members] = await Promise.all([
    getUnnotifiedInsiderProducts(50),
    getInsiderUserEmails(),
  ]);

  if (products.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No new products to notify about.",
      products: 0,
      members: members.length,
      sent: 0,
    });
  }

  if (preview) {
    return NextResponse.json({
      preview: true,
      products: products.length,
      members: members.length,
      productList: products.map((p) => ({
        id: p.id,
        title: p.title,
        store: p.store_name,
        price: p.price,
        currency: p.currency,
        created_at: p.created_at,
      })),
      memberEmails: members,
    });
  }

  // Test send — send only to the provided email, don't mark products as notified
  if (testEmail) {
    const { sent, failed } = await sendInsiderNewArrivalsEmail([testEmail], products);
    return NextResponse.json({
      success: true,
      test: true,
      testEmail,
      products: products.length,
      sent,
      failed,
    });
  }

  const { sent, failed } = await sendInsiderNewArrivalsEmail(members, products);

  // Mark products as notified so they're not included in future sends
  await markProductsAsInsiderNotified(products.map((p) => p.id));

  return NextResponse.json({
    success: true,
    products: products.length,
    members: members.length,
    sent,
    failed,
  });
}

/**
 * GET /api/admin/send-new-arrivals
 * Returns a preview of what would be sent without actually sending.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await initDatabase();
  await initMembershipColumns();

  const [products, emails] = await Promise.all([
    getUnnotifiedInsiderProducts(50),
    getInsiderUserEmails(),
  ]);

  return NextResponse.json({
    ready: products.length > 0 && emails.length > 0,
    products: products.length,
    members: emails.length,
    productList: products.map((p) => ({
      id: p.id,
      title: p.title,
      store: p.store_name,
      price: p.price,
      currency: p.currency,
      created_at: p.created_at,
    })),
  });
}
