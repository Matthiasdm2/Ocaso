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
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // Don't redirect to login if we're already on auth pages
          if (
            typeof window !== "undefined" &&
            !window.location.pathname.match(/^\/(?:login|register|reset|auth)/)
          ) {
            window.location.href = "/login";
          }
          return;
        }

        const { data, error } = await supabase.from("profiles").select(`
          id, full_name, avatar_url, is_business
        `).eq("id", user.id).maybeSingle();

        if (error) {
          console.error(
            "Profile fetch error:",
            error.message,
            error.details,
            error.hint,
          );
          console.error("Full error object:", error);
          // Don't set profile, stay with null
        } else if (data) {
          const parts = (data.full_name || "").trim().split(" ");
          setProfile({
            id: data.id,
            firstName: parts[0] || "",
            lastName: parts.length > 1 ? parts.slice(1).join(" ") : "",
            avatarUrl: data.avatar_url || "",
            business: { isBusiness: !!data.is_business },
          });
        } else {
          // No profile data, try to provision one
          console.log('No profile found for user', user.id, 'attempting auto-provisioning');
          try {
            const provisionRes = await fetch('/api/profile/upsert', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: user.id, email: user.email }),
            });
            if (provisionRes.ok) {
              console.log('Profile auto-provisioned for user', user.id);
              // Now fetch again
              const { data: newData, error: newErr } = await supabase.from("profiles").select(`
                id, full_name, avatar_url, is_business
              `).eq("id", user.id).maybeSingle();
              if (!newErr && newData) {
                const parts = (newData.full_name || "").trim().split(" ");
                setProfile({
                  id: newData.id,
                  firstName: parts[0] || "",
                  lastName: parts.length > 1 ? parts.slice(1).join(" ") : "",
                  avatarUrl: newData.avatar_url || "",
                  business: { isBusiness: !!newData.is_business },
                });
              }
            } else {
              console.error('Profile auto-provisioning failed:', await provisionRes.text());
            }
          } catch (provErr) {
            console.error('Profile auto-provisioning error:', provErr);
          }
        }
      } catch (err) {
        console.error("Profile load error:", err);
      }
      setLoading(false);
    })();
  }, [supabase]);

  // Luister naar globale profielwijzigingen (bv. avatar, naam)
  useEffect(() => {
    function onUpdated(e: Event) {
      const detail = (e as CustomEvent<
        {
          avatarUrl?: string;
          profile?: {
            full_name?: string | null;
            avatar_url?: string | null;
            is_business?: boolean;
          };
          refetch?: boolean;
        }
      >).detail;
      if (detail?.refetch) {
        // Refetch the entire profile
        (async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data, error } = await supabase.from("profiles").select(`
              id, full_name, avatar_url, is_business
            `).eq("id", user.id).maybeSingle();
            if (error) {
              console.error("Profile refetch error:", error);
            } else if (data) {
              const parts = (data.full_name || "").trim().split(" ");
              setProfile({
                id: data.id,
                firstName: parts[0] || "",
                lastName: parts.length > 1 ? parts.slice(1).join(" ") : "",
                avatarUrl: data.avatar_url || "",
                business: { isBusiness: !!data.is_business },
              });
            }
          } catch (err) {
            console.error("Profile refetch error:", err);
          }
        })();
        return;
      }
      if (!detail) return;
      setProfile((p) => {
        if (!p) return p;
        const next = { ...p };
        if (typeof detail.avatarUrl === "string") {
          next.avatarUrl = detail.avatarUrl;
        }
        const fn = detail.profile?.full_name;
        if (typeof fn === "string") {
          const parts = fn.trim().split(" ");
          next.firstName = parts[0] || "";
          next.lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
        }
        const av = detail.profile?.avatar_url;
        if (typeof av === "string") next.avatarUrl = av;
        if (typeof detail.profile?.is_business === "boolean") {
          next.business = { isBusiness: detail.profile.is_business };
        }
        return next;
      });
    }

    if (typeof window !== "undefined") {
      window.addEventListener(
        "ocaso:profile-updated",
        onUpdated as EventListener,
      );
      return () => {
        window.removeEventListener(
          "ocaso:profile-updated",
          onUpdated as EventListener,
        );
      };
    }
  }, [supabase]);

  return { profile, loading, setProfile };
}
