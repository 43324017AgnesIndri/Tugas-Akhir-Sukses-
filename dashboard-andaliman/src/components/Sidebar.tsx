"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

type IconName = "home" | "sliders" | "bars" | "thermometer" | "bell" | "chip" | "users";

interface MenuItem {
  href: string;
  label: string;
  icon: IconName;
  adminOnly?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { href: "/", label: "Dashboard", icon: "home" },
  { href: "/monitoring", label: "Monitoring", icon: "bars" },
  { href: "/kontrol", label: "Control", icon: "sliders" },
  { href: "/threshold", label: "Threshold Settings", icon: "thermometer" },
  { href: "/riwayat", label: "Data History", icon: "bars" },
  { href: "/alarm", label: "Alarms and Logs", icon: "bell" },
  { href: "/perangkat", label: "Devices", icon: "chip" },
  { href: "/pengguna", label: "Users", icon: "users", adminOnly: true },
];

function Logo() {
  return (
    <span className="sidebar-logo-shell">
      <Image
        className="sidebar-logo"
        src="/images/andaliman-logo.png"
        width={52}
        height={52}
        alt=""
        aria-hidden="true"
        priority
      />
    </span>
  );
}

function Icon({ name }: { name: IconName }) {
  const props = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "home":
      return <svg {...props}><path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" /></svg>;
    case "sliders":
      return (
        <svg {...props}>
          <path d="M4 6h16M4 12h16M4 18h16" />
          <circle cx="9" cy="6" r="2" fill="currentColor" />
          <circle cx="15" cy="12" r="2" fill="currentColor" />
          <circle cx="8" cy="18" r="2" fill="currentColor" />
        </svg>
      );
    case "bars":
      return <svg {...props}><path d="M5 20V10M12 20V4M19 20v-7" /></svg>;
    case "thermometer":
      return (
        <svg {...props}>
          <path d="M14 14.5V5a3 3 0 0 0-6 0v9.5a5 5 0 1 0 6 0Z" />
          <path d="M11 11v7" />
        </svg>
      );
    case "bell":
      return (
        <svg {...props}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );
    case "chip":
      return (
        <svg {...props}>
          <rect x="6" y="6" width="12" height="12" rx="2" />
          <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
        </svg>
      );
    case "users":
      return (
        <svg {...props}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6M16 5a3 3 0 0 1 0 6M18 14c2 .6 3.5 2.6 3.5 6" />
        </svg>
      );
  }
}

function DirectionIcon({ direction }: { direction: "left" | "right" | "close" }) {
  if (direction === "close") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="m6 6 12 12M18 6 6 18" /></svg>;
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d={direction === "left" ? "m14 5-7 7 7 7" : "m10 5 7 7-7 7"} />
    </svg>
  );
}

function LeafPattern() {
  return (
    <svg className="sidebar-leaf-pattern" viewBox="0 0 220 180" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="2">
        <path d="M24 176C42 124 85 76 189 24M72 120c-28-2-42-17-44-40 24-1 43 12 48 35m31-37c-5-28 7-47 29-56 8 25-1 45-25 58m-35 77c-27-13-36-34-27-57 24 8 37 26 33 51m57-67c4-26 20-40 45-41 0 26-14 43-40 47" />
      </g>
    </svg>
  );
}

interface SidebarProps {
  isAdmin?: boolean;
  isOnline?: boolean;
  alarmCount?: number;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onMobileClose: () => void;
}

export default function Sidebar({
  isAdmin,
  isOnline = false,
  alarmCount = 0,
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const loading = isAdmin === undefined;
  let itemOrder = 0;

  return (
    <aside
      id="main-sidebar"
      className={`sidebar${collapsed ? " is-collapsed" : ""}${mobileOpen ? " is-mobile-open" : ""}`}
      aria-label="Main sidebar"
    >
      <LeafPattern />

      <header className="sidebar-header">
        <div className="sidebar-brand-row">
          <Logo />
          <div className="sidebar-brand-copy">
            <span className="sidebar-brand-name">Andaliman</span>
            <span className="sidebar-brand-word">STORAGE</span>
          </div>
          <button
            type="button"
            className="sidebar-mobile-close"
            onClick={onMobileClose}
            aria-label="Close navigation"
          >
            <DirectionIcon direction="close" />
          </button>
        </div>

        <div className="sidebar-header-meta">
          <p className="sidebar-tagline">IoT environment control system</p>
          {isOnline && (
            <span className="sidebar-status">
              <span className="sidebar-status-dot" />
              Connected
            </span>
          )}
        </div>
      </header>

      <nav className="sidebar-nav" aria-label="Main navigation">
        <div className="sidebar-nav-items">
          {MENU_ITEMS.filter((item) => !item.adminOnly || loading || isAdmin).map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const ghost = Boolean(item.adminOnly) && loading;
            const itemStyle = { "--item-delay": `${itemOrder++ * 40}ms` } as CSSProperties;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-nav-link${active ? " is-active" : ""}${ghost ? " is-ghost" : ""}`}
                title={collapsed ? item.label : undefined}
                aria-label={collapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                aria-hidden={ghost ? true : undefined}
                tabIndex={ghost ? -1 : undefined}
                style={itemStyle}
                onClick={onMobileClose}
              >
                <span className="sidebar-nav-content">
                  <span className="sidebar-nav-icon"><Icon name={item.icon} /></span>
                  <span className="nav-label">{item.label}</span>
                </span>
                {item.href === "/alarm" && alarmCount > 0 && (
                  <span className="nav-badge" aria-label={`${alarmCount} active alarms`}>
                    {alarmCount > 99 ? "99+" : alarmCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <footer className="sidebar-footer">
        <div className="sidebar-bottom-art">
          <Image
            src="/images/andaliman-bg.png"
            alt=""
            fill
            sizes="(max-width: 1023px) 280px, 272px"
            className="sidebar-bottom-art-image"
            aria-hidden="true"
          />
          <div className="sidebar-bottom-art-overlay" aria-hidden="true" />
          <div className="sidebar-bottom-art-copy">
            <strong>Postharvest Andaliman Storage</strong>
            <span>Real-time monitoring for the best quality</span>
          </div>
        </div>
      </footer>

      <button
        type="button"
        className="sidebar-collapse-toggle"
        onClick={onToggleCollapse}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!collapsed}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <DirectionIcon direction={collapsed ? "right" : "left"} />
      </button>
    </aside>
  );
}
