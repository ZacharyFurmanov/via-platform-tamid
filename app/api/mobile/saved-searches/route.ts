import { NextResponse } from "next/server";
import { getMobileUserId } from "@/app/lib/mobileAuth";
import {
 listSavedSearches,
 createSavedSearch,
 type SavedSearchFilters,
} from "@/app/lib/saved-searches-db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
 const userId = getMobileUserId(request);
 if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 try {
 const searches = await listSavedSearches(userId);
 return NextResponse.json({ searches });
 } catch (err) {
 console.error("[saved-searches GET]", err);
 return NextResponse.json({ searches: [] });
 }
}

export async function POST(request: Request) {
 const userId = getMobileUserId(request);
 if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 let body: { name?: string; filters?: SavedSearchFilters };
 try {
 body = await request.json();
 } catch {
 return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
 }

 const name = (body.name ?? "").trim();
 if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

 const filters: SavedSearchFilters = body.filters ?? {};

 try {
 const search = await createSavedSearch(userId, name, filters);
 return NextResponse.json({ search });
 } catch (err) {
 console.error("[saved-searches POST]", err);
 return NextResponse.json({ error: "Save failed" }, { status: 500 });
 }
}
