import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth";
import { getUserFavoritedProducts, getUserStoreFavoriteIds } from "@/app/lib/favorites-db";
import { getReferralInfo, getPilotIsInsider } from "@/app/lib/pilot-db";
import AccountPageClient from "./AccountPageClient";

export default async function AccountPage() {
 const session = await auth();
 if (!session?.user) {
 redirect("/login");
 }

 const userId = session.user.id!;
 const email = session.user.email ?? null;

 const [favProducts, storeSlugs, referralInfo, isInsider] = await Promise.all([
 getUserFavoritedProducts(userId).catch(() => []),
 getUserStoreFavoriteIds(userId).catch(() => []),
 email ? getReferralInfo(email).catch(() => null) : Promise.resolve(null),
 email ? getPilotIsInsider(email).catch(() => false) : Promise.resolve(false),
 ]);

 return (
 <AccountPageClient
 userId={userId}
 name={session.user.name ?? null}
 email={email}
 image={session.user.image ?? null}
 favoritesCount={favProducts.length}
 storesCount={storeSlugs.length}
 favProducts={favProducts}
 referralCode={referralInfo?.referralCode ?? null}
 referralCount={referralInfo?.referralCount ?? 0}
 isInsider={isInsider}
 />
 );
}
