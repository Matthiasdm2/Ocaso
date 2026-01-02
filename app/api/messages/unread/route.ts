export const runtime = "nodejs";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

function supabaseFromBearer(token?: string | null) {
  if (!token) return null;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  } catch {
    return null;
  }
}

// GET total unread count across all conversations
export async function GET(request: Request) {
  try {
    let supabase = supabaseServer();
    let user;
    try {
      const got = await supabase.auth.getUser();
      user = got.data.user;
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[unread] getUser error", e);
      }
    }
    if (!user) {
      const auth = request.headers.get("authorization");
      const token = auth?.toLowerCase().startsWith("bearer ")
        ? auth.slice(7)
        : null;
      const alt = supabaseFromBearer(token);
      if (alt) {
        try {
          const got = await alt.auth.getUser();
          if (got.data.user) {
            user = got.data.user;
            supabase = alt;
          }
        } catch (e) {
          if (process.env.NODE_ENV !== "production") {
            console.debug("[unread] alt getUser error", e);
          }
        }
      }
    }
    if (!user) return NextResponse.json({ unread: 0 });
    
    // Try to use conversation_overview RPC, but fallback to manual query if it doesn't exist
    let total = 0;
    try {
      const { data, error } = await supabase.rpc("conversation_overview");
      if (error) {
        // If RPC doesn't exist, fallback to manual query
        console.warn("[unread] conversation_overview RPC failed, using fallback:", error.message);
        const { data: conversations } = await supabase
          .from("conversations")
          .select("id, participants")
          .contains("participants", [user.id]);
        
        if (conversations && conversations.length > 0) {
          const conversationIds = conversations.map((c: { id: string }) => c.id);
          const { data: unreadMessages } = await supabase
            .from("messages")
            .select("id, conversation_id, sender_id, created_at")
            .in("conversation_id", conversationIds)
            .neq("sender_id", user.id)
            .is("deleted_at", null);
          
          // Check against conversation_reads
          const { data: reads } = await supabase
            .from("conversation_reads")
            .select("conversation_id, last_read_at")
            .eq("user_id", user.id)
            .in("conversation_id", conversationIds);
          
          const readMap = new Map<string, string | null>(reads?.map((r: { conversation_id: string; last_read_at: string | null }) => [r.conversation_id, r.last_read_at]) || []);
          total = (unreadMessages || []).filter((m: { conversation_id: string | null; created_at: string | null }) => {
            const lastRead = readMap.get(m.conversation_id || '');
            if (!lastRead || !m.created_at) return true;
            try {
              const msgTime = new Date(m.created_at).getTime();
              const readTime = lastRead ? new Date(lastRead).getTime() : 0;
              return msgTime > readTime;
            } catch {
              return true;
            }
          }).length;
        }
      } else {
        type Row = { unread_count: number | null };
        const arr: Row[] = Array.isArray(data) ? (data as Row[]) : [];
        total = arr.reduce((sum, r) => sum + (r.unread_count || 0), 0);
      }
    } catch (rpcError) {
      console.error("[unread] Error fetching unread count:", rpcError);
      // Return 0 instead of error to prevent UI issues
      total = 0;
    }
    
    return NextResponse.json({ unread: total });
  } catch (e: unknown) {
    let msg = "unexpected";
    if (typeof e === "object" && e && "message" in e) {
      const m = (e as { message?: unknown }).message;
      if (typeof m === "string") msg = m;
    }
    if (process.env.NODE_ENV !== "production") {
      console.error("[unread] fatal", e);
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
