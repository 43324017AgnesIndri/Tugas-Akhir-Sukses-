"use client";

import { ChevronDown, LogOut } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import WifiButton from "./wifiButton";
import { useApi } from "@/hooks/useApi";
import { useProfile } from "@/hooks/useProfile";
import { signOut } from "@/lib/auth";
import type { AlarmRecord, Profile } from "@/lib/types";

interface Props {
  title: string;
  subtitle?: string;
  statusText?: string;
  online?: boolean;
  dashboard?: boolean;
  children: ReactNode;
}

function MenuIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function ProfileMenu({
  profile,
  onLogout,
}: {
  profile: Profile | null;
  onLogout: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const displayName = profile?.nama?.trim() || profile?.email || "User";
  const initials = displayName
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const role = !profile ? "Loading account" : profile.role === "admin" ? "Administrator" : "Viewer";

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="profile-menu" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        className="profile-trigger"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-label={`Profile menu for ${displayName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? "profile-menu" : undefined}
      >
        <span className="profile-avatar" aria-hidden="true">{initials || "P"}</span>
        <span className="profile-name">{displayName}</span>
        <ChevronDown className="profile-chevron" size={16} aria-hidden="true" />
      </button>

      {open && (
        <div className="profile-popover" id="profile-menu" role="menu" aria-label="Profile menu">
          <div className="profile-details" role="group" aria-label="Account information">
            <strong>{displayName}</strong>
            {profile?.email && <span>{profile.email}</span>}
            <span>{role}</span>
          </div>
          <div className="profile-divider" role="separator" />
          <button
            type="button"
            className="profile-logout"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void onLogout();
            }}
          >
            <LogOut size={17} aria-hidden="true" />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}

const COLLAPSE_STORAGE_KEY = "andaliman-sidebar-collapsed";
let memoryCollapsed = false;

function subscribeToSidebarState(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("andaliman-sidebar-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("andaliman-sidebar-change", callback);
  };
}

function getSidebarState() {
  try {
    memoryCollapsed = window.localStorage.getItem(COLLAPSE_STORAGE_KEY) === "true";
  } catch {
    return memoryCollapsed;
  }
  return memoryCollapsed;
}

function getServerSidebarState() {
  return false;
}

export default function AppShell({
  title,
  subtitle,
  statusText,
  online,
  dashboard = false,
  children,
}: Props) {
  const router = useRouter();
  const { profile } = useProfile();
  const alarms = useApi<{ alarms: AlarmRecord[] }>("/api/alarms?limit=200", 30000);
  const [clock, setClock] = useState<string | null>(null);
  const sidebarCollapsed = useSyncExternalStore(
    subscribeToSidebarState,
    getSidebarState,
    getServerSidebarState,
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleString("en-US"));
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);

    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!mobileSidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileSidebarOpen(false);
    };
    const closeOnDesktopResize = () => {
      if (window.innerWidth >= 1024) setMobileSidebarOpen(false);
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnDesktopResize);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnDesktopResize);
    };
  }, [mobileSidebarOpen]);

  const logout = async () => {
    await signOut();
    router.replace("/login");
    router.refresh();
  };

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    memoryCollapsed = next;
    try {
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
    } catch {
      // Keep the current session usable when browser storage is unavailable.
    }
    window.dispatchEvent(new Event("andaliman-sidebar-change"));
  };

  const text = statusText
    ? clock
      ? `${statusText} - ${clock}`
      : statusText
    : (clock ?? "");
  const activeAlarmCount = alarms.data?.alarms.filter((alarm) => !alarm.acknowledged).length ?? 0;

  return (
    <div className={`app${sidebarCollapsed ? " sidebar-collapsed" : ""}${mobileSidebarOpen ? " mobile-sidebar-open" : ""}${dashboard ? " app-dashboard" : ""}`}>
      <Sidebar
        isAdmin={profile ? profile.role === "admin" : undefined}
        isOnline={online === true}
        alarmCount={activeAlarmCount}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onToggleCollapse={toggleSidebar}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      {mobileSidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close navigation menu"
        />
      )}

      <main>
        <div className={`top${dashboard ? " top-dashboard" : ""}`}>
          <div className="top-heading">
            <button
              type="button"
              className="mobile-menu-toggle"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileSidebarOpen}
              aria-controls="main-sidebar"
            >
              <MenuIcon />
            </button>
            <div className="top-title">
              <h1>{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>

          <div className="pills">
            <WifiButton isAdmin={profile?.role === "admin"} />

            <div className="pill">
              {online !== undefined && (
                <span className={`dot ${online ? "" : "off"}`} />
              )}
              <span>{text}</span>
            </div>
            <ProfileMenu profile={profile} onLogout={logout} />
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}
