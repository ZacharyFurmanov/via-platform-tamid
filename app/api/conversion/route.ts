import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

type ConversionItem = {
  productId?: string;
  productName: string;
  quantity: number;
  price: number;
};

type ConversionRecord = {
  conversionId: string;
  timestamp: string;
  orderId: string;
  orderTotal: number;
  currency: string;
  items: ConversionItem[];
  viaClickId: string | null;
  storeSlug: string;
  storeName: string;
  matched: boolean;
  matchedClickData?: {
    clickId: string;
    clickTimestamp: string;
    productName: string;
  };
};

type ClickRecord = {
  clickId: string;
  timestamp: string;
  productId: string;
  productName: string;
  store: string;
  storeSlug: string;
  externalUrl: string;
  userAgent?: string;
};

const DATA_DIR = path.join(process.cwd(), "app", "data");
const CONVERSIONS_FILE = path.join(DATA_DIR, "conversions.json");
const CLICKS_FILE = path.join(DATA_DIR, "clicks.json");

async function loadConversions(): Promise<ConversionRecord[]> {
  try {
    const data = await fs.readFile(CONVERSIONS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function loadClicks(): Promise<ClickRecord[]> {
  try {
    const data = await fs.readFile(CLICKS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveConversion(conversion: ConversionRecord): Promise<void> {
  const conversions = await loadConversions();
  conversions.push(conversion);

  // Keep only last 5000 conversions
  const trimmed = conversions.slice(-5000);

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(CONVERSIONS_FILE, JSON.stringify(trimmed, null, 2));
}

function generateConversionId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// POST - Record a conversion (from store's checkout)
export async function POST(request: NextRequest) {
  try {
    // Handle CORS for cross-origin requests from store checkouts
    const origin = request.headers.get("origin");

    const body = await request.json();
    const {
      orderId,
      orderTotal,
      currency = "USD",
      items = [],
      viaClickId,
      storeSlug,
      storeName,
    } = body;

    // Validate required fields
    if (!orderId || !storeSlug || !storeName) {
      return NextResponse.json(
        { error: "Missing required fields: orderId, storeSlug, storeName" },
        { status: 400 }
      );
    }

    if (typeof orderTotal !== "number" || orderTotal < 0) {
      return NextResponse.json(
        { error: "orderTotal must be a positive number" },
        { status: 400 }
      );
    }

    // Check for duplicate orders
    const existingConversions = await loadConversions();
    const isDuplicate = existingConversions.some(
      (c) => c.orderId === orderId && c.storeSlug === storeSlug
    );

    if (isDuplicate) {
      return NextResponse.json(
        { message: "Conversion already recorded", duplicate: true },
        { status: 200 }
      );
    }

    // Try to match the viaClickId to a click record
    let matched = false;
    let matchedClickData: ConversionRecord["matchedClickData"] = undefined;

    if (viaClickId) {
      const clicks = await loadClicks();
      const matchingClick = clicks.find((c) => c.clickId === viaClickId);

      if (matchingClick) {
        matched = true;
        matchedClickData = {
          clickId: matchingClick.clickId,
          clickTimestamp: matchingClick.timestamp,
          productName: matchingClick.productName,
        };
      }
    }

    const conversion: ConversionRecord = {
      conversionId: generateConversionId(),
      timestamp: new Date().toISOString(),
      orderId,
      orderTotal,
      currency,
      items,
      viaClickId: viaClickId || null,
      storeSlug,
      storeName,
      matched,
      matchedClickData,
    };

    await saveConversion(conversion);

    const response = NextResponse.json(
      {
        success: true,
        conversionId: conversion.conversionId,
        matched,
      },
      { status: 201 }
    );

    // Set CORS headers for cross-origin requests
    if (origin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }

    return response;
  } catch (error) {
    console.error("Conversion tracking error:", error);
    return NextResponse.json(
      { error: "Failed to record conversion" },
      { status: 500 }
    );
  }
}

// OPTIONS - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");

  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

// GET - Retrieve conversions (for admin dashboard)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "all";

    let conversions = await loadConversions();

    // Apply date filter
    if (range !== "all") {
      const now = new Date();
      let cutoff: Date;

      if (range === "7d") {
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (range === "30d") {
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else {
        cutoff = new Date(0);
      }

      conversions = conversions.filter(
        (c) => new Date(c.timestamp) >= cutoff
      );
    }

    // Calculate stats
    const totalConversions = conversions.length;
    const matchedConversions = conversions.filter((c) => c.matched).length;
    const totalRevenue = conversions.reduce((sum, c) => sum + c.orderTotal, 0);
    const matchedRevenue = conversions
      .filter((c) => c.matched)
      .reduce((sum, c) => sum + c.orderTotal, 0);

    // Revenue by store
    const revenueByStore: Record<string, { total: number; matched: number; count: number }> = {};
    for (const conv of conversions) {
      if (!revenueByStore[conv.storeName]) {
        revenueByStore[conv.storeName] = { total: 0, matched: 0, count: 0 };
      }
      revenueByStore[conv.storeName].total += conv.orderTotal;
      revenueByStore[conv.storeName].count++;
      if (conv.matched) {
        revenueByStore[conv.storeName].matched += conv.orderTotal;
      }
    }

    // Recent conversions
    const recentConversions = conversions.slice(-20).reverse();

    return NextResponse.json({
      totalConversions,
      matchedConversions,
      totalRevenue,
      matchedRevenue,
      revenueByStore,
      recentConversions,
      range,
    });
  } catch (error) {
    console.error("Error fetching conversions:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversions" },
      { status: 500 }
    );
  }
}
