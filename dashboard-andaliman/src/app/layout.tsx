"use client";

import type { ReactNode } from "react";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { useProfile } from "@/hooks/useProfile";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { profile } = useProfile();

  return (
    <html lang="id">
      <body>
        <div className="app">
          <Sidebar isAdmin={profile?.role === "admin"} />
          {children}
        </div>
      </body>
    </html>
  );
}