"use client";

import { useRouter } from "next/navigation";

export default function BackBar() {
  const router = useRouter();

  return (
    <div className="mb-6">
      <div className="bg-primary/10 border border-primary/30 rounded-full px-4 py-2 flex items-center gap-2 w-fit">
        <button
          type="button"
          onClick={() => router.push('/marketplace')}
          className="rounded-full bg-primary text-black px-3 py-1 text-sm font-semibold border border-primary/30 hover:bg-primary/80 transition"
        >
          ← Terug
        </button>
        <span className="text-sm text-primary font-medium">Zoekertje</span>
      </div>
    </div>
  );
}
