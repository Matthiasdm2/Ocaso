"use client";
import { useState } from "react";

import { createClient } from "../lib/supabaseClient";

import LoginPrompt from "./LoginPrompt";
import ReviewModal from "./ReviewModal";

export default function ReviewModalButton({ listingId, className = "" }: { listingId?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  async function handleOpen() {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const session = data?.session;

    if (!session) {
      setShowLoginPrompt(true);
      return;
    }

    setOpen(true);
  }

  function handleReview() {
    // noop for now — parent components can refresh lists if needed
    setOpen(false);
  }

  return (
    <>
      <button onClick={handleOpen} className={`btn btn-primary ${className}`}>
        Plaats review
      </button>

      {open && (
        <ReviewModal
          listingId={listingId ?? ""}
          onClose={() => setOpen(false)}
          onReview={handleReview}
        />
      )}

      {showLoginPrompt && <LoginPrompt onClose={() => setShowLoginPrompt(false)} />}
    </>
  );
}

