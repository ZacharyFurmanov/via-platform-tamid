import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth";
import { getUserFavoritedProducts, getUserStoreFavoriteIds } from "@/app/lib/favorites-db";
import { getReferralInfo } from "@/app/lib/pilot-db";
import { neon } from "@neondatabase/serverless";
import AccountPageClient from "./AccountPageClient";

async function getUserSettings(userId: string): Promise<{ notificationsEnabled: boolean; phone: string }> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return { notificationsEnabled: true, phone: "" };
  const sql = neon(url);
  const rows = await sql`SELECT notification_emails_enabled, phone FROM users WHERE id = ${userId}`;
  return {
    notificationsEnabled: rows[0]?.notification_emails_enabled !== false,
    phone: (rows[0]?.phone as string) || "",
  };
}

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const userId = session.user.id!;

  const [favProducts, storeSlugs, settings, referralInfo] = await Promise.all([
    getUserFavoritedProducts(userId).catch(() => []),
    getUserStoreFavoriteIds(userId).catch(() => []),
    getUserSettings(userId),
    session.user.email ? getReferralInfo(session.user.email).catch(() => null) : Promise.resolve(null),
  ]);

  const storesCount = storeSlugs.length;

  return (
    <AccountPageClient
      userId={userId}
      name={session.user.name ?? null}
      email={session.user.email ?? null}
      image={session.user.image ?? null}
      favoritesCount={favProducts.length}
      storesCount={storesCount}
      favProducts={favProducts}
      notificationsEnabled={settings.notificationsEnabled}
      initialPhone={settings.phone}
      referralCode={referralInfo?.referralCode ?? null}
    />
  );
}
