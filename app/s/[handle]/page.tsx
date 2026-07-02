import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { stores } from "@/app/lib/stores";
import { getStorefrontByHandle, getStorefrontByHandleAny } from "@/app/lib/storefront-db";
import { hasCaptures } from "@/app/lib/site-capture-db";
import StorefrontView from "../StorefrontView";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string }>; searchParams: Promise<{ preview?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
 const { handle } = await params;
 const sf = await getStorefrontByHandleAny(handle).catch(() => null);
 if (!sf) return { title: "Storefront" };
 const store = stores.find((s) => s.slug === sf.storeSlug);
 return {
 title: store?.name ?? handle,
 description: sf.tagline || (store ? `Shop ${store.name} — vintage and one-of-a-kind.` : undefined),
 robots: { index: false }, // keep private until storefronts are public-ready
 };
}

export default async function StorefrontPage({ params, searchParams }: Props) {
 const { handle } = await params;
 const { preview } = await searchParams;

 // Public access only resolves *live* storefronts; ?preview resolves it even when
 // off (the owner previewing), with a "not live yet" ribbon.
 const sf = preview
 ? await getStorefrontByHandleAny(handle).catch(() => null)
 : await getStorefrontByHandle(handle).catch(() => null);
 if (!sf) return notFound();

 // If the seller brought their own site over, THAT is their storefront — serve the
 // captured site instead of the block builder. (The builder is for no-site sellers.)
 if (!preview && (await hasCaptures(sf.storeSlug).catch(() => false))) redirect(`/site/${sf.storeSlug}`);

 return (
 <>
 {!sf.enabled && (
 <div className="bg-[#5D0F17] py-1.5 text-center text-[11px] uppercase tracking-[0.2em] text-[#FFFDF8]">
 Preview · not live yet
 </div>
 )}
 <StorefrontView settings={sf} preview={!!preview} />
 </>
 );
}
