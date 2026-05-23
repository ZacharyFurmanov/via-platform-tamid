export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth";
import YouMightLikeClient from "./YouMightLikeClient";

export default async function YouMightLikePage() {
  const session = await auth();
  if (!session) redirect("/login");
  return <YouMightLikeClient />;
}
