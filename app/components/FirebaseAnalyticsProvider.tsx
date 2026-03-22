"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { identifyAnalyticsUser, trackPageView } from "@/app/lib/firebase-analytics";

export default function FirebaseAnalyticsProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  useEffect(() => {
    const search = searchParams.toString();
    trackPageView(pathname, search);
  }, [pathname, searchParams]);

  useEffect(() => {
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
    identifyAnalyticsUser(userId);
  }, [session]);

  return null;
}
