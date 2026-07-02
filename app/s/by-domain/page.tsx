import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { stores } from "@/app/lib/stores";
import { getStorefrontByDomain } from "@/app/lib/storefront-db";
import StorefrontView from "../StorefrontView";

export const dynamic = "force-dynamic";

// Reached only via a middleware rewrite when a request arrives on a seller's
// connected custom domain. We resolve the storefront from the Host header.

async function resolveFromHost() {
 const host = (await headers()).get("host") || "";
 if (!host) return null;
 return getStorefrontByDomain(host).catch(() => null);
}

export async function generateMetadata(): Promise<Metadata> {
 const sf = await resolveFromHost();
 if (!sf) return { title: "Storefront" };
 const store = stores.find((s) => s.slug === sf.storeSlug);
 return {
 title: store?.name ?? "Storefront",
 description: sf.tagline || (store ? `Shop ${store.name} — vintage and one-of-a-kind.` : undefined),
 robots: { index: false },
 };
}

export default async function CustomDomainStorefront() {
 const sf = await resolveFromHost();
 if (!sf) return notFound();
 return <StorefrontView settings={sf} />;
}
