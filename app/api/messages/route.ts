
import { getServerUser } from "@/lib/getServerUser";
import { supabaseServer } from "@/lib/supabaseServer";

// GET /api/messages?conversation_id=... | user_id=...
export async function GET(req: Request) {
  const supabase = supabaseServer();
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversation_id");
  const userId = searchParams.get("user_id");
  if (!conversationId && !userId) {
    return new Response(JSON.stringify({ items: [] }), {
      status: 200,
      headers: corsHeaders(),
    });
  }
  let q = supabase
    .from("messages")
    .select("id,body,created_at,sender_id,conversation_id")
    .order("created_at", { ascending: true })
    .limit(100);
  if (conversationId) q = q.eq("conversation_id", conversationId);
  if (userId) q = q.eq("sender_id", userId);
  const { data, error } = await q;
  if (error) {
    return new Response(JSON.stringify({ error: error.message, items: [] }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
  return new Response(JSON.stringify({ items: data || [] }), {
    status: 200,
    headers: corsHeaders(),
  });
}

// POST /api/messages  Body: { conversation_id, body }
export async function POST(req: Request) {
  const supabase = supabaseServer();
  const { user } = await getServerUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "Niet ingelogd" }), {
      status: 401,
      headers: corsHeaders(),
    });
  }
  let body: { conversation_id?: string; body?: string } = {};
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "Ongeldige JSON" }), { status: 400, headers: corsHeaders() }); }
  const { conversation_id, body: messageBody } = body;
  if (!conversation_id || !messageBody) {
    return new Response(JSON.stringify({ error: "conversation_id en body verplicht" }), { status: 400, headers: corsHeaders() });
  }
  const insertData = {
    conversation_id,
    body: messageBody,
    sender_id: user.id,
  };
  const { data, error } = await supabase
    .from("messages")
    .insert(insertData)
    .select("id,body,created_at,sender_id,conversation_id")
    .maybeSingle();
  if (error || !data) {
    return new Response(JSON.stringify({ error: error?.message || "Kon bericht niet opslaan" }), { status: 500, headers: corsHeaders() });
  }
  return new Response(JSON.stringify(data), { status: 201, headers: corsHeaders() });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
