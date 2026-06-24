import { NextResponse } from "next/server";
import { isApprovedRequest } from "@/app/lib/approval";
import { visibleStores } from "@/app/lib/stores";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
 if (!(await isApprovedRequest(request))) return NextResponse.json({ error: "Approval required", needsApproval: true }, { status: 403 });
 const stores = visibleStores.map((s) => ({
 slug: s.slug,
 name: s.name,
 location: s.location ?? null,
 image: s.image ?? null,
 logo: s.logo ?? null,
 logoBg: (s as { logoBg?: string }).logoBg ?? "#ffffff",
 description: s.description ?? null,
 website: s.website ?? null,
 }));

 return NextResponse.json({ stores });
}
