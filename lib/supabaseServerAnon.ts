// lib/supabaseServerAnon.ts
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export function supabaseServerAnon() {
  const cookieStore = cookies();
  return createServerComponentClient({ cookies: () => cookieStore });
}
