"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabaseClient";

type Props = { id: string; onFavorite?: (favorited: boolean) => void };

export default function FavoriteButton({ id, onFavorite }: Props) {
  const [isFav, setIsFav] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  async function authHeaders(): Promise<Record<string, string>> {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` };
    } catch {
      // ignore
    }
    return {};
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      const headers = await authHeaders();
      fetch(`/api/listings/${id}/is-favorite`, { credentials: "include", headers })
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (!mounted) return;
          if (data) setIsFav(Boolean(data.isFavorite));
        })
        .catch(() => {});
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const toggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const path = isFav ? "unfavorite" : "favorite";
      const headers = await authHeaders();
      const res = await fetch(`/api/listings/${id}/${path}`, { method: "POST", credentials: "include", headers });
      if (!res.ok) {
        // Log status and body for easier debugging when requests fail
        let bodyText = "";
        try { bodyText = await res.text(); } catch (e) { bodyText = String(e); }
        console.error("Favorite toggle failed", { status: res.status, statusText: res.statusText, body: bodyText });
      } else {
        const next = !isFav;
        setIsFav(next);
        if (onFavorite) onFavorite(next);
      }
    } catch (err) {
      console.error("Favorite toggle error", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
  aria-label={isFav ? "Verwijder favoriet" : "Voeg toe aan favorieten"}
      aria-pressed={isFav}
      disabled={loading}
      className="inline-flex items-center justify-center"
    >
      <Heart
        className={`h-4 w-4 ${isFav ? "text-red-500" : "text-gray-600"}`}
        fill={isFav ? "currentColor" : "none"}
      />
  {/* expose testid for UI tests and aria-live for screen readers */}
  <span className="sr-only" aria-live="polite" data-testid={`favorite-status-${id}`}>{isFav ? 'favorited' : 'not-favorited'}</span>
    </button>
  );
}
