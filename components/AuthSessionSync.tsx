"use client";
/* eslint-disable simple-import-sort/imports */
import { createClient } from '@/lib/supabaseClient';
import { useEffect, useRef } from 'react';

/**
 * Zorgt dat server routes de gebruiker zien door bij auth state changes
 * de tokens naar /api/auth/sync te sturen zodat httpOnly cookies gezet worden.
 */
export default function AuthSessionSync() {
  const once = useRef(false);
  useEffect(() => {
    const supabase = createClient();

    async function pushSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        await fetch('/api/auth/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }),
        });
      } catch { /* ignore */ }
    }

    // Eerste load (een keer)
    if (!once.current) {
      once.current = true;
      pushSession();
    }

  const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void pushSession();
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);
  return null;
}
