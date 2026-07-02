import { NextRequest, NextResponse } from "next/server";
import { resolveStoreSlugAny } from "@/app/lib/storeAuth";
import { getConversationsByStore } from "@/app/lib/messaging-db";

export const dynamic = "force-dynamic";

// Store inbox: list conversations for the acting store.
export async function GET(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 const conversations = await getConversationsByStore(slug).catch(() => []);
 return NextResponse.json({ conversations });
}
