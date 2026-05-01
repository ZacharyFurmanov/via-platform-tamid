"use client";

import { usePathname } from "next/navigation";
import AdminNav from "@/app/components/AdminNav";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";

  if (isLogin) return <>{children}</>;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <AdminNav />
      <main style={{ flex: 1, marginLeft: 220, minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}
