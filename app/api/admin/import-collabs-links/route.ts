import { NextRequest, NextResponse } from "next/server";
import { updateCollabsLink } from "@/app/lib/db";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://collabs.shopify.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || authHeader !== `Bearer ${adminPassword}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { links } = body as { links?: { id: number; collabsLink: string }[] };

  if (!Array.isArray(links)) {
    return NextResponse.json(
      { error: "links must be an array" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  let saved = 0;
  let failed = 0;

  for (const { id, collabsLink } of links) {
    if (typeof id !== "number" || typeof collabsLink !== "string") {
      failed++;
      continue;
    }
    // Only accept real collabs.shop links
    if (!collabsLink.startsWith("https://collabs.shop/")) {
      failed++;
      continue;
    }
    try {
      await updateCollabsLink(id, collabsLink);
      saved++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ saved, failed }, { headers: CORS_HEADERS });
}
