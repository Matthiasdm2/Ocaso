
"use client";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabaseClient";

export type ProfileLite = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  business?: { isBusiness: boolean };
};

export function useProfile() {
  const supabase = createClient();
  const [profile, setProfile] = useState<ProfileLite | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (typeof window !== "undefined") window.location.href = "/login"; return; }

      const { data } = await supabase.from("profiles").select(`
        id, full_name, avatar_url, is_business
      `).eq("id", user.id).maybeSingle();

      if (data) {
        const parts = (data.full_name || "").trim().split(" ");
        setProfile({
          id: data.id,
          firstName: parts[0] || "",
          lastName: parts.length > 1 ? parts.slice(1).join(" ") : "",
          avatarUrl: data.avatar_url || "",
          business: { isBusiness: !!data.is_business },
        });
      }
      setLoading(false);
    })();
  }, [supabase]);

  // Luister naar globale profielwijzigingen (bv. avatar, naam)
  useEffect(() => {
    function onUpdated(e: Event) {
      const detail = (e as CustomEvent<{ avatarUrl?: string; profile?: { full_name?: string | null; avatar_url?: string | null } }>).detail;
      if (!detail) return;
      setProfile((p) => {
        if (!p) return p;
  const next = { ...p };
        if (typeof detail.avatarUrl === 'string') next.avatarUrl = detail.avatarUrl;
        const fn = detail.profile?.full_name;
        if (typeof fn === 'string') {
          const parts = fn.trim().split(" ");
          next.firstName = parts[0] || "";
          next.lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
        }
        const av = detail.profile?.avatar_url;
        if (typeof av === 'string') next.avatarUrl = av;
        return next;
      });
    }
    if (typeof window !== "undefined") {
      window.addEventListener('ocaso:profile-updated', onUpdated as EventListener);
      return () => window.removeEventListener('ocaso:profile-updated', onUpdated as EventListener);
    }
  }, []);

  return { profile, loading, setProfile };
}
