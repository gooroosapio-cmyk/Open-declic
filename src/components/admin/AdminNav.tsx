"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Fiches" },
  { href: "/admin/import", label: "Import" },
  { href: "/admin/acces", label: "Accès" },
  { href: "/admin/reglages", label: "Réglages" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Administration" className="admin-nav">
      {LINKS.map((l) => {
        const active = l.href === "/admin" ? path === "/admin" || path.startsWith("/admin/fiches") : path.startsWith(l.href);
        return <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}>{l.label}</Link>;
      })}
    </nav>
  );
}
