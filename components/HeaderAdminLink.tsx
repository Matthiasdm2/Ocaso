// voorbeeld: components/HeaderAdminLink.tsx
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabaseClient";

export default function HeaderAdminLink() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setIsAdmin(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();

        setIsAdmin(!!profile?.is_admin);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    };

    checkAdmin();
  }, []);

  // Only show if we know the user is admin
  if (isAdmin !== true) return null;

  return (
    <Link href="/admin" className="px-3 py-2 rounded-lg hover:bg-gray-50 text-sm">
      Admin
    </Link>
  );
}
