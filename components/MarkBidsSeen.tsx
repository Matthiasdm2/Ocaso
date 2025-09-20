"use client";
import { useEffect } from 'react';

import { createClient } from '@/lib/supabaseClient';

export default function MarkBidsSeen({ listingId, count }: { listingId: string; count: number }) {
  const supabase = createClient();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) return;
        if (cancelled) return;
  await supabase.from('listing_bid_reads').upsert({ user_id: user.id, listing_id: listingId, last_seen_count: count }, { onConflict: 'user_id,listing_id' });
  try { window.dispatchEvent(new Event('ocaso:bids-seen-changed')); } catch { /* ignore */ }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [supabase, listingId, count]);
  return null;
}
