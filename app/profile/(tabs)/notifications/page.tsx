
"use client";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabaseClient";

type Notifs = { newMessages: boolean; bids: boolean; priceDrops: boolean; tips: boolean; };

export default function NotificationsPage() {
  const supabase = createClient();
  const [n, setN] = useState<Notifs | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("notifications").eq("id", user.id).maybeSingle();
      setN(data?.notifications || { newMessages: true, bids: true, priceDrops: true, tips: true });
    })();
  }, [supabase]);

  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !n) return;
  await supabase.from("profiles").upsert({ id: user.id, notifications: n });
    setSaving(false);
  }

  if (!n) return <div>Laden…</div>;

  return (
    <div className="space-y-4">
      {Object.entries(n).map(([k, v]) => (
        <label key={k} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={v} onChange={(e)=> setN({ ...n, [k]: e.target.checked })}/>
          <span>{k}</span>
        </label>
      ))}
      <div className="flex justify-end">
        <button onClick={save} disabled={saving}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white">
          {saving ? "Opslaan…" : "Opslaan"}
        </button>
      </div>
    </div>
  );
}
