"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";

const NAV_ITEMS = [
  { label: "Analytics", href: "/admin/analytics" },
  { label: "Customers", href: "/admin/customers" },
  { label: "Emails", href: "/admin/emails" },
  { label: "Editor's Picks", href: "/admin/editors-picks" },
  { label: "Sync", href: "/admin/sync" },
  { label: "Collabs", href: "/admin/collabs-links" },
  { label: "Giveaway", href: "/admin/giveaway" },
  { label: "Sourcing", href: "/admin/sourcing" },
  { label: "Stores", href: "/admin/stores" },
];

export default function AdminNav() {
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", gap: 24, height: 56 }}>
        <Link href="/admin/analytics" style={{ flexShrink: 0 }}>
          <Image src="/vya-logo.png" alt="VYA" width={36} height={36} style={{ objectFit: "contain" }} />
        </Link>
        <nav style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, overflowX: "auto" }}>
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  whiteSpace: "nowrap",
                  padding: "6px 12px",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  textDecoration: "none",
                  background: active ? "#5D0F17" : "transparent",
                  color: active ? "#F7F3EA" : "rgba(93,15,23,0.5)",
                  transition: "all 0.15s",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={handleLogout}
          style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(93,15,23,0.4)", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
