import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/app/lib/auth";
import { getUserCollections, canViewCollections } from "@/app/lib/user-collections-db";
import { neon } from "@neondatabase/serverless";

async function getFriendProfile(userId: string) {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return null;
  const sql = neon(url);
  const rows = await sql`SELECT id, name, email, image FROM users WHERE id = ${userId}`;
  return rows[0] ?? null;
}

type Props = { params: Promise<{ userId: string }> };

export default async function FriendCollectionsPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { userId } = await params;
  const [allowed, friend] = await Promise.all([
    canViewCollections(session.user.id, userId),
    getFriendProfile(userId),
  ]);

  if (!friend) return notFound();
  if (!allowed) {
    return (
      <main className="bg-[#F7F3EA] min-h-screen text-[#5D0F17] flex items-center justify-center">
        <div className="text-center p-8">
          <p className="font-serif text-xl mb-2">Collections are private</p>
          <p className="text-sm text-[#5D0F17]/50 mb-6">You need to be friends to view each other&apos;s collections.</p>
          <Link href="/account/friends" className="text-xs uppercase tracking-[0.15em] underline hover:no-underline">
            Go to Friends
          </Link>
        </div>
      </main>
    );
  }

  const collections = await getUserCollections(userId);
  const friendName = (friend.name as string) || (friend.email as string)?.split("@")[0] || "Your friend";

  return (
    <main className="bg-[#F7F3EA] min-h-screen text-[#5D0F17]">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <Link href="/account/friends" className="text-xs uppercase tracking-[0.2em] text-[#5D0F17]/40 hover:text-[#5D0F17] transition mb-6 inline-block">
          ← Friends
        </Link>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-full bg-[#D8CABD]/40 overflow-hidden shrink-0">
            {friend.image ? (
              <img src={friend.image as string} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-lg font-serif text-[#5D0F17]/40">
                  {(friendName[0] || "?").toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-serif">{friendName}&apos;s Collections</h1>
            <p className="text-sm text-[#5D0F17]/50">{collections.length} {collections.length === 1 ? "board" : "boards"}</p>
          </div>
        </div>

        {collections.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#5D0F17]/50 text-sm">{friendName} hasn&apos;t created any collections yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {collections.map((col) => (
              <Link key={col.id} href={`/account/friends/${userId}/collections/${col.id}`} className="group block">
                <div className="aspect-square bg-[#D8CABD]/30 overflow-hidden mb-2">
                  {col.coverImage ? (
                    <img src={col.coverImage} alt={col.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-[#5D0F17]/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium text-[#5D0F17] truncate">{col.name}</p>
                <p className="text-[10px] text-[#5D0F17]/40 uppercase tracking-wide">{col.itemCount} {col.itemCount === 1 ? "item" : "items"}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
