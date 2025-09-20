// app/admin/_utils/adminGuard.ts
"use server";
import { supabaseServerAnon } from "@/lib/supabaseServerAnon";

export async function assertAdmin() {
  const sb = supabaseServerAnon();
  const { data: { user }, error } = await sb.auth.getUser();
  if (error || !user) throw new Error("Niet ingelogd");

  const { data: prof, error: pErr } = await sb
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (pErr) throw pErr;
  if (!prof?.is_admin) throw new Error("Geen admin-rechten");
  return user;
}
