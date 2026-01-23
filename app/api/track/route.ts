import { NextRequest, NextResponse } from "next/server";
import { generateClickId, ClickRecord } from "@/app/lib/track";
import fs from "fs/promises";
import path from "path";

const CLICKS_FILE = path.join(process.cwd(), "app", "data", "clicks.json");

async function loadClicks(): Promise<ClickRecord[]> {
  try {
    const data = await fs.readFile(CLICKS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveClick(click: ClickRecord): Promise<void> {
  const clicks = await loadClicks();
  clicks.push(click);

  // Keep only last 10000 clicks to prevent file bloat
  const trimmedClicks = clicks.slice(-10000);

  await fs.mkdir(path.dirname(CLICKS_FILE), { recursive: true });
  await fs.writeFile(CLICKS_FILE, JSON.stringify(trimmedClicks, null, 2));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const productId = searchParams.get("pid");
  const productName = searchParams.get("pn");
  const store = searchParams.get("s");
  const storeSlug = searchParams.get("ss");
  const externalUrl = searchParams.get("url");

  // Validate required params
  if (!externalUrl) {
    return NextResponse.json({ error: "Missing URL" }, { status: 400 });
  }

  // Validate URL is safe (must be http/https)
  try {
    const url = new URL(externalUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      return NextResponse.json({ error: "Invalid URL protocol" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Log click asynchronously (don't block redirect)
  const clickRecord: ClickRecord = {
    clickId: generateClickId(),
    timestamp: new Date().toISOString(),
    productId: productId || "unknown",
    productName: productName || "unknown",
    store: store || "unknown",
    storeSlug: storeSlug || "unknown",
    externalUrl,
  };

  // Fire and forget - don't wait for save to complete
  saveClick(clickRecord).catch(console.error);

  // Redirect to the actual product URL
  return NextResponse.redirect(externalUrl, 302);
}
