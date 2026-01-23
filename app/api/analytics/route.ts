import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import type { ClickRecord } from "@/app/lib/track";

const CLICKS_FILE = path.join(process.cwd(), "app", "data", "clicks.json");

async function loadClicks(): Promise<ClickRecord[]> {
  try {
    const data = await fs.readFile(CLICKS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function GET() {
  const clicks = await loadClicks();

  // Calculate analytics
  const clicksByStore: Record<string, number> = {};
  const clicksByProduct: Record<string, { count: number; name: string; store: string }> = {};

  for (const click of clicks) {
    // Count by store
    clicksByStore[click.store] = (clicksByStore[click.store] || 0) + 1;

    // Count by product
    if (!clicksByProduct[click.productId]) {
      clicksByProduct[click.productId] = {
        count: 0,
        name: click.productName,
        store: click.store,
      };
    }
    clicksByProduct[click.productId].count++;
  }

  // Get top products
  const topProducts = Object.entries(clicksByProduct)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Get recent clicks (last 20)
  const recentClicks = clicks.slice(-20).reverse();

  return NextResponse.json({
    totalClicks: clicks.length,
    clicksByStore,
    topProducts,
    recentClicks,
  });
}
