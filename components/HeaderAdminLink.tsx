// voorbeeld: components/HeaderAdminLink.tsx
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabaseClient";

export default function HeaderAdminLink() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    
    const checkAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setIsAdmin(false);
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
          return;
        }

        setIsAdmin(!!profile?.is_admin);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    };

    // Check immediately
    checkAdmin();

    // Listen for auth state changes (login/logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setIsAdmin(false);
      } else {
        // Re-check admin status when user logs in
        checkAdmin();
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Only show if we know the user is admin
  if (isAdmin !== true) return null;

  return (
    <Link href="/admin" className="px-3 py-2 rounded-lg hover:bg-gray-50 text-sm">
      Admin
    </Link>
  );
}
