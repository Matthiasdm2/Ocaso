// app/api/shop-views/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(request: NextRequest) {
  try {
    const { shop_slug } = await request.json();

    if (!shop_slug) {
      return NextResponse.json({ error: "shop_slug is required" }, { status: 400 });
    }

    const supabase = supabaseServer();

    // Get client IP and user agent for tracking
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Generate a simple session ID based on IP and user agent (not perfect but good enough for analytics)
    const sessionId = Buffer.from(`${ip}-${userAgent}`).toString('base64').slice(0, 32);

    // Insert the view
    const { error } = await supabase
      .from('shop_views')
      .insert({
        shop_slug,
        viewer_ip: ip !== 'unknown' ? ip : null,
        user_agent: userAgent,
        session_id: sessionId
      });

    if (error) {
      console.error('Error tracking shop view:', error);
      return NextResponse.json({ error: 'Failed to track view' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in shop views API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
