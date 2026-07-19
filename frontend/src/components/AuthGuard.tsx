"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let token = null;
    try {
      token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    } catch (e) {
      console.warn("Storage access restricted:", e);
    }
    if (!token) {
      router.replace("/login");
      return;
    }
    apiGet<unknown>("/api/v1/auth/me", token)
      .then(() => setOk(true))
      .catch(() => {
        try { localStorage.removeItem("token"); } catch (e) {}
        router.replace("/login");
      });
  }, [router]);

  if (!ok) return null;
  return <>{children}</>;
}
