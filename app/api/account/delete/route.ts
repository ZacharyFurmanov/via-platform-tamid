import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { getDb } from "@/app/lib/firebase-db";

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const db = getDb();

  const [notificationSnaps, activitySnaps, requestSnaps, friendshipSnaps, productFavSnaps, storeFavSnaps, accountSnaps] =
    await Promise.all([
      getDocs(collection(db, "favorite_notifications")),
      getDocs(collection(db, "friend_activity")),
      getDocs(collection(db, "friend_requests")),
      getDocs(collection(db, "friendships")),
      getDocs(collection(db, "product_favorites")),
      getDocs(collection(db, "store_favorites")),
      getDocs(collection(db, "auth_accounts")),
    ]);

  for (const snap of notificationSnaps.docs) {
    const row = snap.data() as { user_id?: string };
    if (row.user_id === userId) await deleteDoc(snap.ref);
  }

  for (const snap of activitySnaps.docs) {
    const row = snap.data() as { user_id?: string };
    if (row.user_id === userId) await deleteDoc(snap.ref);
  }

  for (const snap of requestSnaps.docs) {
    const row = snap.data() as { from_user_id?: string; to_user_id?: string };
    if (row.from_user_id === userId || row.to_user_id === userId) await deleteDoc(snap.ref);
  }

  for (const snap of friendshipSnaps.docs) {
    const row = snap.data() as { user_a_id?: string; user_b_id?: string };
    if (row.user_a_id === userId || row.user_b_id === userId) await deleteDoc(snap.ref);
  }

  for (const snap of productFavSnaps.docs) {
    const row = snap.data() as { user_id?: string };
    if (row.user_id === userId) await deleteDoc(snap.ref);
  }

  for (const snap of storeFavSnaps.docs) {
    const row = snap.data() as { user_id?: string };
    if (row.user_id === userId) await deleteDoc(snap.ref);
  }

  for (const snap of accountSnaps.docs) {
    const row = snap.data() as { user_id?: string };
    if (row.user_id === userId) await deleteDoc(snap.ref);
  }

  await deleteDoc(doc(collection(db, "users"), userId));

  return NextResponse.json({ ok: true });
}
