import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/app/lib/storeAuth";

export const dynamic = "force-dynamic";

// Gate for the /infrastructure/admin workspace — 200 if the caller is an admin,
// 401 otherwise, so the layout can redirect non-admins to the admin login.
export async function GET(request: NextRequest) {
 if (!isAdminRequest(request)) return NextResponse.json({ admin: false }, { status: 401 });
 return NextResponse.json({ admin: true });
}
