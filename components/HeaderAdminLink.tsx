// voorbeeld: components/HeaderAdminLink.tsx
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

import { supabase } from "../lib/supabaseClient";

export default function HeaderAdminLink() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      type UserMetadata = { is_admin?: boolean };
      const userMetadata = data.user?.user_metadata as UserMetadata | undefined;
      const isAdmin = userMetadata?.is_admin === true;
      if (mounted) setShow(!!isAdmin);
    });
    return () => { mounted = false; };
  }, []);
  if (!show) return null;
  return (
    <Link href="/admin/categories" className="btn-secondary">Admin</Link>
  );
}
