import { NextRequest, NextResponse } from "next/server";
import { saveConversion, getConversionAnalytics, getClickByClickId } from "@/app/lib/analytics-db";

function generateConversionId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// POST - Record a conversion (from store's checkout)
export async function POST(request: NextRequest) {
  try {
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

    // Try to match the viaClickId to a click record
    let matched = false;
    let matchedClickData: { clickId: string; clickTimestamp: string; productName: string } | undefined;

    if (viaClickId) {
      const matchingClick = await getClickByClickId(viaClickId);
      if (matchingClick) {
        matched = true;
        matchedClickData = {
          clickId: matchingClick.clickId,
          clickTimestamp: matchingClick.timestamp,
          productName: matchingClick.productName,
        };
      }
    }

    const result = await saveConversion({
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
    });

    if (result.duplicate) {
      const response = NextResponse.json(
        { message: "Conversion already recorded", duplicate: true },
        { status: 200 }
      );
      if (origin) response.headers.set("Access-Control-Allow-Origin", origin);
      return response;
    }

    const response = NextResponse.json(
      { success: true, matched },
      { status: 201 }
    );

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

    const data = await getConversionAnalytics(range);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching conversions:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversions" },
      { status: 500 }
    );
  }
}
