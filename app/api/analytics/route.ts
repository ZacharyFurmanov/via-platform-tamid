import { NextRequest, NextResponse } from "next/server";
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "all"; // "7d", "30d", "all"

  let clicks = await loadClicks();

  // Apply date filter
  if (range !== "all") {
    const now = new Date();
    let cutoff: Date;

    if (range === "7d") {
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === "30d") {
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      cutoff = new Date(0); // All time
    }

    clicks = clicks.filter((click) => new Date(click.timestamp) >= cutoff);
  }

  // Calculate analytics
  const clicksByStore: Record<string, number> = {};
  const clicksByProduct: Record<
    string,
    { count: number; name: string; store: string }
  > = {};

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

  // Get top products (top 10)
  const topProducts = Object.entries(clicksByProduct)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Sort stores by click count for display
  const sortedClicksByStore = Object.entries(clicksByStore)
    .sort(([, a], [, b]) => b - a)
    .reduce((acc, [store, count]) => {
      acc[store] = count;
      return acc;
    }, {} as Record<string, number>);

  // Get recent clicks (last 50)
  const recentClicks = clicks.slice(-50).reverse();

  return NextResponse.json({
    totalClicks: clicks.length,
    clicksByStore: sortedClicksByStore,
    topProducts,
    recentClicks,
    range,
  });
}
