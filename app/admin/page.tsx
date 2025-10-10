import { redirect } from "next/navigation";

import { supabaseAdmin } from "@/lib/supabaseServer";

import AdminPanel from "./AdminPanel";

export default async function AdminPage() {
  const supabase = supabaseAdmin();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/");
  }

  return <AdminPanel />;
}
