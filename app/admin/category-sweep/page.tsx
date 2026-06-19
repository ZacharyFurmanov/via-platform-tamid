import { stores } from "@/app/lib/stores";
import CategorySweepClient from "./CategorySweepClient";

export const dynamic = "force-dynamic";

export default function CategorySweepPage() {
 const storeOptions = stores
 .map((s) => ({ slug: s.slug, name: s.name }))
 .sort((a, b) => a.name.localeCompare(b.name));
 return <CategorySweepClient stores={storeOptions} />;
}
