"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";
import { useCompare } from "./compare-store";

const ITEMS: { href: string; label: string; icon: IconName; match: (p: string) => boolean }[] = [
  { href: "/", label: "Découvrir", icon: "explorer", match: (p) => p === "/" || (p.startsWith("/projets") && !p.endsWith("/kit")) || p.startsWith("/aide-choix") },
  { href: "/comparer", label: "Comparer", icon: "etapes", match: (p) => p.startsWith("/comparer") },
  { href: "/mes-projets", label: "Mes projets", icon: "favoris", match: (p) => p.startsWith("/mes-projets") },
  { href: "/mes-kits", label: "Mes kits", icon: "projets", match: (p) => p.startsWith("/mes-kits") || p.endsWith("/kit") },
];

export function BottomNav() {
  const pathname = usePathname();
  const { ids } = useCompare();
  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      <ul>
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={active ? "page" : undefined}>
                <Icon name={item.icon} />
                <span>
                  {item.label}
                  {item.href === "/comparer" && ids.length > 0 && (
                    <span className="count" aria-label={`, ${ids.length} sélectionné${ids.length > 1 ? "s" : ""}`}>{ids.length}</span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
