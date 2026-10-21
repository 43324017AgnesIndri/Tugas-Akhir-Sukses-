"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type IconName = "home" | "chart" | "sliders" | "gauge" | "bars" | "bell" | "chip" | "users";

const MENU: { href: string; label: string; icon: IconName; adminOnly?: boolean }[] = [
  { href: "/", label: "Dashboard", icon: "home" },
  { href: "/monitoring", label: "Monitoring", icon: "chart" },
  { href: "/kontrol", label: "Kontrol", icon: "sliders" },
  { href: "/threshold", label: "Pengaturan threshold", icon: "gauge" },
  { href: "/riwayat", label: "Riwayat data", icon: "bars" },
  { href: "/alarm", label: "Alarm dan log", icon: "bell" },
  { href: "/perangkat", label: "Perangkat", icon: "chip" },
  { href: "/pengguna", label: "Pengguna", icon: "users", adminOnly: true },
];

function Icon({ name }: { name: IconName }) {
  const p = {
    width: 20, height: 20, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const, "aria-hidden": true,
  };
  switch (name) {
    case "home": return <svg {...p}><path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" /></svg>;
    case "chart": return <svg {...p}><path d="M3 3v18h18M7 15l4-4 3 3 5-6" /></svg>;
    case "sliders": return <svg {...p}><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="9" cy="6" r="2" fill="var(--fo)" /><circle cx="15" cy="12" r="2" fill="var(--fo)" /><circle cx="8" cy="18" r="2" fill="var(--fo)" /></svg>;
    case "gauge": return <svg {...p}><path d="M4 17a8 8 0 1 1 16 0M12 17l4-5" /></svg>;
    case "bars": return <svg {...p}><path d="M5 20V10M12 20V4M19 20v-7" /></svg>;
    case "bell": return <svg {...p}><path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7M10 20a2 2 0 0 0 4 0" /></svg>;
    case "chip": return <svg {...p}><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" /></svg>;
    case "users": return <svg {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6M16 5a3 3 0 0 1 0 6M18 14c2 .6 3.5 2.6 3.5 6" /></svg>;
  }
}

/* Ilustrasi ranting andaliman (SVG) */
function Sprig() {
  return (
    <svg
      className="side-sprig"
      viewBox="0 0 240 100"
      fill="none"
      aria-hidden="true"
      style={{ display: "block", width: "100%", height: "auto", maxHeight: 100, marginBottom: 14 }}
    >
      <g stroke="var(--fo-mu)" strokeWidth="1.2" strokeLinejoin="round">
        <path d="M120 78C92 70 56 62 24 38C64 34 98 50 120 78Z" fill="rgba(168,184,160,.18)" />
        <path d="M120 78C148 70 184 62 216 38C176 34 142 50 120 78Z" fill="rgba(168,184,160,.18)" />
        <path d="M120 70C108 48 112 24 128 6C138 28 134 50 120 70Z" fill="rgba(168,184,160,.28)" />
        <path d="M120 96V70M24 38C60 48 96 62 120 78M216 38C180 48 144 62 120 78" />
      </g>
      <g fill="#c4a76a" opacity=".9">
        {[[110,74],[120,70],[130,74],[115,82],[125,82],[120,90],[105,82],[135,82]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="5" />
        ))}
      </g>
    </svg>
  );
}

export default function Sidebar({
  isAdmin,
  alarmCount = 0,
}: {
  isAdmin: boolean;
  alarmCount?: number;
}) {
  const pathname = usePathname();

  return (
    <aside>
      <Sprig />

      <div className="brand">
        Andaliman Storage
        <small>Sistem kontrol lingkungan IoT</small>
      </div>

      <nav>
        {MENU.filter((m) => !m.adminOnly || isAdmin).map((m) => {
          const active =
            m.href === "/" ? pathname === "/" : pathname.startsWith(m.href);
          return (
            <Link key={m.href} href={m.href} className={active ? "on" : ""}>
              <Icon name={m.icon} />
              <span className="nav-label">{m.label}</span>
              {m.href === "/alarm" && alarmCount > 0 && (
                <span className="nav-badge">{alarmCount}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Foto: style inline memastikan foto terkurung di kotak ini */}
      <div
        className="side-photo"
        style={{
          position: "relative",
          marginTop: "auto",
          height: 240,
          borderRadius: 18,
          overflow: "hidden",
        }}
      >
        <Image
          src="/images/andaliman3.png"
          alt="Buah andaliman"
          fill
          sizes="240px"
          style={{ objectFit: "cover" }}
        />
        <div
          className="cap"
          style={{
            position: "absolute",
            zIndex: 1,
            left: 14,
            right: 14,
            bottom: 12,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <strong>Postharvest Andaliman Storage</strong>
          <span>Pemantauan real-time untuk kualitas terbaik</span>
        </div>
      </div>
    </aside>
  );
}