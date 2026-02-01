import { getActiveCategories } from "@/app/lib/getActiveCategories";
import HeaderClient from "@/app/components/HeaderClient";

export default async function Header() {
  const categories = await getActiveCategories();
  return <HeaderClient categories={categories} />;
}
