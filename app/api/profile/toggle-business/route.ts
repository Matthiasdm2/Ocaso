import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

export async function POST() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Get current business status
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("is_business")
    .eq("id", user.id)
    .single();

  const newBusinessStatus = !currentProfile?.is_business;

  // Update business status
  const { error } = await supabase
    .from("profiles")
    .update({ is_business: newBusinessStatus })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ isBusiness: newBusinessStatus });
}
