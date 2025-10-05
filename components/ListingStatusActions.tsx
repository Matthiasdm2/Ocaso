// components/ListingStatusActions.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useToast } from "@/components/Toast";

type Status = "active" | "paused" | "sold" | string;

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
    setLoading(status === "paused" ? "pause" : status === "active" ? "resume" : "sold");
    try {
      const response = await fetch(`/api/listings/${listingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Status updaten mislukt");
      }

      push(`Zoekertje is nu ${label}.`);
      router.refresh();
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : "Status updaten mislukt.";
      push(errorMsg);
    } finally {
      setLoading(null);
    }
  };

  const isPaused = currentStatus === "paused";
  const isSold = currentStatus === "sold";

  return (
    <div className="flex items-center gap-2">
      {/* Pauzeren/Hervatten */}
      <button
        type="button"
        disabled={isSold || loading !== null}
        onClick={() => setStatus(isPaused ? "active" : "paused", isPaused ? "actief" : "gepauzeerd")}
        className={`text-sm px-3 py-1 rounded-full border transition ${
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
        onClick={() => setStatus("sold", "verkocht")}
        className="text-sm px-3 py-1 rounded-full border bg-rose-50 text-rose-700 border-rose-200 hover:opacity-90 disabled:opacity-50"
        aria-label="Markeer als verkocht"
      >
        {loading === "sold" ? "Bezig…" : isSold ? "Verkocht" : "Verkocht"}
      </button>
    </div>
  );
}

