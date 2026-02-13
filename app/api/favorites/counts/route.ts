import { NextRequest, NextResponse } from "next/server";
import { getProductFavoriteCounts } from "@/app/lib/favorites-db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids");

  if (!idsParam) {
    return NextResponse.json({ error: "ids param required" }, { status: 400 });
  }

  const productIds = idsParam
    .split(",")
    .map((id) => parseInt(id, 10))
    .filter((id) => !isNaN(id));

  if (productIds.length === 0) {
    return NextResponse.json({ counts: {} });
  }

  const counts = await getProductFavoriteCounts(productIds);
  return NextResponse.json({ counts });
}
