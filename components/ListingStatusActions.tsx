// components/ListingStatusActions.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/Toast";
// ✅ BELANGRIJK: gebruik de geïnstantieerde client
import { supabase } from "@/lib/supabaseClient";

type Status = "actief" | "gepauzeerd" | "verkocht" | string;

export default function ListingStatusActions({
  listingId,
  currentStatus,
}: {
  listingId: string;
  currentStatus?: Status | null;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [loading, setLoading] = useState<null | "pause" | "resume" | "sold">(null);

  const setStatus = async (status: Status, label: string) => {
    setLoading(status === "gepauzeerd" ? "pause" : status === "actief" ? "resume" : "sold");
    try {
      const { error } = await supabase.from("listings").update({ status }).eq("id", listingId);
      if (error) throw error;
      push(`Zoekertje is nu ${label}.`);
      router.refresh();
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : "Status updaten mislukt.";
      push(errorMsg);
    } finally {
      setLoading(null);
    }
  };

  const isPaused = currentStatus === "gepauzeerd";
  const isSold = currentStatus === "verkocht";

  return (
    <div className="flex items-center gap-2">
      {/* Pauzeren/Hervatten */}
      <button
        type="button"
        disabled={isSold || loading !== null}
        onClick={() => setStatus(isPaused ? "actief" : "gepauzeerd", isPaused ? "actief" : "gepauzeerd")}
        className={`text-xs px-3 py-1 rounded-full border transition ${
          isPaused
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:opacity-90"
            : "bg-amber-50 text-amber-700 border-amber-200 hover:opacity-90"
        } disabled:opacity-50`}
        aria-label={isPaused ? "Hervatten" : "Pauzeren"}
      >
        {loading === "pause" || loading === "resume" ? "Bezig…" : isPaused ? "Hervatten" : "Pauzeren"}
      </button>

      {/* Markeer als verkocht */}
      <button
        type="button"
        disabled={isSold || loading !== null}
        onClick={() => setStatus("verkocht", "verkocht")}
        className="text-xs px-3 py-1 rounded-full border bg-rose-50 text-rose-700 border-rose-200 hover:opacity-90 disabled:opacity-50"
        aria-label="Markeer als verkocht"
      >
        {loading === "sold" ? "Bezig…" : isSold ? "Verkocht" : "Verkocht"}
      </button>
    </div>
  );
}

