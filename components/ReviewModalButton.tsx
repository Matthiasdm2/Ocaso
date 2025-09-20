"use client";
import { useState } from "react";

import ReviewModal from "./ReviewModal";

export default function ReviewModalButton({ listingId }: { listingId: string }) {
  const [showModal, setShowModal] = useState(false);
  return (
    <>
      <div className="flex justify-center mt-6">
        <button
          className="rounded-full bg-primary text-black px-6 py-2 font-semibold border border-primary/30 shadow hover:bg-primary/80 transition"
          onClick={() => setShowModal(true)}
        >
          Review plaatsen
        </button>
      </div>
      {showModal && (
  <ReviewModal listingId={listingId} onClose={() => setShowModal(false)} onReview={() => setShowModal(false)} />
      )}
    </>
  );
}
