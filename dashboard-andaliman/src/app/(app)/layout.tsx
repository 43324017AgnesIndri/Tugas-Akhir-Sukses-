"use client";

import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import { useProfile } from "@/hooks/useProfile";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { profile } = useProfile();

  return (
    <div className="app">
      <Sidebar isAdmin={profile ? profile.role === "admin" : undefined} />
      {children}
    </div>
  );
}
