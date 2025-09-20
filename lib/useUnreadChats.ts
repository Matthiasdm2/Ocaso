"use client";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabaseClient";

export function useUnreadChats() {
  const supabase = createClient();
  const [total, setTotal] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { if (active) { setTotal(0); setReady(true); } return; }
        const headers: Record<string, string> = {};
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
        } catch { /* ignore */ }
        const r = await fetch('/api/messages/unread', { cache: 'no-store', headers });
        const d = await r.json();
        if (active && typeof d.unread === 'number') setTotal(d.unread);
      } catch { if (active) setTotal(0); } finally { if (active) setReady(true); }
    }
    load();
    const id = window.setInterval(load, 15000);
    const onRead = () => load();
    window.addEventListener('ocaso:conversation-read', onRead as EventListener);
    return () => { active = false; clearInterval(id); window.removeEventListener('ocaso:conversation-read', onRead as EventListener); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  return { total, ready };
}
