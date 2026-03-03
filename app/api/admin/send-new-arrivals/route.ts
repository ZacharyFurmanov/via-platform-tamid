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
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
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

  await initDatabase();
  await initMembershipColumns();

  const [products, emails] = await Promise.all([
    getUnnotifiedInsiderProducts(50),
    getInsiderUserEmails(),
  ]);

  if (products.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No new products to notify about.",
      products: 0,
      members: emails.length,
      sent: 0,
    });
  }

  if (preview) {
    return NextResponse.json({
      preview: true,
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
      memberEmails: emails,
    });
  }

  const { sent, failed } = await sendInsiderNewArrivalsEmail(emails, products);

  // Mark products as notified so they're not included in future sends
  await markProductsAsInsiderNotified(products.map((p) => p.id));

  return NextResponse.json({
    success: true,
    products: products.length,
    members: emails.length,
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
