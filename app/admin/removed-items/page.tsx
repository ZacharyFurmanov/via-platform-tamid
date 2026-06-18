import { stores } from "@/app/lib/stores";
import RemovedItemsClient from "./RemovedItemsClient";

export const dynamic = "force-dynamic";

export default function RemovedItemsPage() {
 const storeOptions = stores
 .map((s) => ({ slug: s.slug, name: s.name }))
 .sort((a, b) => a.name.localeCompare(b.name));
 return <RemovedItemsClient stores={storeOptions} />;
}
