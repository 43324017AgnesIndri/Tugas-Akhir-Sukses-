"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MENU: { href: string; label: string; adminOnly?: boolean }[] = [
  { href: "/", label: "Dashboard" },
  { href: "/monitoring", label: "Monitoring" },
  { href: "/kontrol", label: "Kontrol" },
  { href: "/threshold", label: "Pengaturan threshold" },
  { href: "/riwayat", label: "Riwayat data" },
  { href: "/alarm", label: "Alarm dan log" },
  { href: "/perangkat", label: "Perangkat" },
  { href: "/pengguna", label: "Pengguna", adminOnly: true },
];

export default function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <aside>
      <div className="brand">
        Andaliman Storage
        <small>Sistem kontrol lingkungan IoT</small>
      </div>
      <nav>
        {MENU.filter((m) => !m.adminOnly || isAdmin).map((m) => {
          const active = m.href === "/" ? pathname === "/" : pathname.startsWith(m.href);
          return (
            <Link key={m.href} href={m.href} className={active ? "on" : ""}>
              {m.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
