import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  try {
    // Update the recalc_dashboard_stats function to match the actual schema
    const updateFunctionSQL = `
      create or replace function public.recalc_dashboard_stats(bid uuid) returns void as $$
      declare
        v_listings int;
        v_sold int;
        v_avg int;
        v_views bigint;
        v_bids int;
        v_followers int;
      begin
        perform public.ensure_dashboard_stats_row(bid);

        select count(*) filter (where status in ('active','published')),
               count(*) filter (where status = 'sold'),
               coalesce(avg(price)::int,0),
               coalesce(sum(l.views),0),
               coalesce((select count(*) from bids b where b.listing_id = l.id),0)
        into v_listings, v_sold, v_avg, v_views, v_bids
        from listings l
        where l.seller_id = bid;

        -- Followers optioneel: probeer query; als tabel niet bestaat => 0
        begin
          execute 'select count(*) from public.follows where business_id = $1' into v_followers using bid;
        exception when undefined_table then
          v_followers := 0;  -- tabel bestaat (nog) niet
        end;

        update public.dashboard_stats ds set
          listings = coalesce(v_listings,0),
          sold = coalesce(v_sold,0),
          avg_price = coalesce(v_avg,0),
          views = coalesce(v_views,0),
          bids = coalesce(v_bids,0),
          followers = coalesce(v_followers,0),
          updated_at = now()
        where ds.business_id = bid;
      end;$$ language plpgsql security definer;
    `;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin() as any)
      .rpc("exec_sql", {
        sql: updateFunctionSQL,
      });

    if (error) {
      return NextResponse.json({ error: `Failed to update function: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Dashboard stats function updated successfully" });

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
