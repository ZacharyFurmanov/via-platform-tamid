"use client";

import { usePathname } from "next/navigation";

// Hides its children on /admin routes without importing them (stays server-side)
export function AdminHide({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return <>{children}</>;
}

// Conditionally applies the header offset padding
export function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <main className={pathname.startsWith("/admin") ? "" : "pt-[104px]"}>{children}</main>;
}
