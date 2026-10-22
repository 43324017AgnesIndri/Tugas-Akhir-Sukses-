"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import WifiButton from "./wifiButton";
import { useProfile } from "@/hooks/useProfile";
import { signOut } from "@/lib/auth";

interface Props {
  title: string;
  subtitle?: string;
  statusText?: string;
  online?: boolean;
  children: ReactNode;
}

export default function AppShell({
  title,
  subtitle,
  statusText,
  online,
  children,
}: Props) {
  const router = useRouter();
  const { profile } = useProfile();
  const [clock, setClock] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleString("id-ID"));
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);

    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const logout = async () => {
    await signOut();
    router.replace("/login");
    router.refresh();
  };

  const text = statusText
    ? clock
      ? `${statusText} - ${clock}`
      : statusText
    : (clock ?? "");

  return (
    <div className="app">
      <Sidebar isAdmin={profile ? profile.role === "admin" : undefined} />
      <main>
        <div className="top">
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>

          <div className="pills">
            <WifiButton isAdmin={profile?.role === "admin"} />

            <div className="pill">
              {online !== undefined && (
                <span className={`dot ${online ? "" : "off"}`} />
              )}
              <span>{text}</span>
            </div>

            <div className="pill">
              {profile
                ? `${profile.nama ?? profile.email} · ${
                    profile.role === "admin" ? "Admin" : "Viewer"
                  }`
                : "..."}
            </div>

            <button type="button" className="pill" onClick={logout}>
              Keluar
            </button>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}