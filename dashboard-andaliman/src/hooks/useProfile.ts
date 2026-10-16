"use client";

import { useEffect, useState } from "react";
import { getCurrentProfile } from "@/lib/auth";
import type { Profile } from "@/lib/types";

// Mengambil profil (nama dan role) akun yang sedang login
export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getCurrentProfile()
      .then((p) => {
        if (alive) {
          setProfile(p);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { profile, loading };
}
