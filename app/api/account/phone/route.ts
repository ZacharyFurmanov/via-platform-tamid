import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { getDb, nowIso } from "@/app/lib/firebase-db";

export async function PUT(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { phone } = await request.json();
  if (typeof phone !== "string") {
    return NextResponse.json({ error: "phone must be a string" }, { status: 400 });
  }

  const normalized = phone.replace(/\D/g, "");
  if (normalized.length < 10 || normalized.length > 15) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  const snaps = await getDocs(collection(getDb(), "users"));
  const conflict = snaps.docs.find((snap) => {
    if (snap.id === userId) return false;
    const row = snap.data() as { phone?: string | null };
    return row.phone === normalized;
  });

  if (conflict) {
    return NextResponse.json({ error: "Phone number already in use" }, { status: 409 });
  }

  await setDoc(
    doc(collection(getDb(), "users"), userId),
    { phone: normalized, updated_at: nowIso() },
    { merge: true }
  );

  return NextResponse.json({ ok: true, phone: normalized });
}
