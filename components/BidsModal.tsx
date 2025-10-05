"use client";
import { useState } from "react";

interface Bid {
  amount: number;
  created_at?: string;
}

interface Props {
  bids: Bid[];
}

export default function BidsModal({ bids }: Props) {
  const [open, setOpen] = useState(false);
  // Sorteer biedingen van laag naar hoog
  const sortedBids = [...bids].sort((a, b) => a.amount - b.amount);

  return (
    <>
      <button
        type="button"
        className="text-sm text-emerald-700 font-semibold underline cursor-pointer"
        onClick={() => setOpen(true)}
        disabled={bids.length === 0}
      >
        Hoogste bod
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-bold text-emerald-700">Alle biedingen</h3>
            </div>
            {sortedBids.length > 0 ? (
              <div className="px-6 py-4 max-h-60 overflow-y-auto">
                <ul className="space-y-2">
                  {sortedBids.map((bid, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm text-gray-800">
                      <span className="font-semibold text-emerald-700">€ {bid.amount}</span>
                      <span className="text-sm text-gray-500">{bid.created_at ? new Date(bid.created_at).toLocaleString("nl-BE") : ""}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="px-6 py-4 text-sm text-gray-500">Er zijn nog geen biedingen.</div>
            )}
            <div className="px-6 py-4 border-t flex justify-end">
              <button
                type="button"
                className="px-4 py-2 bg-emerald-700 text-white rounded hover:bg-emerald-800"
                onClick={() => setOpen(false)}
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
