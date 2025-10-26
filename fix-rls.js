import { supabaseServiceRole } from "./lib/supabaseServiceRole";

async function fixRLS() {
  const supabase = supabaseServiceRole();

  console.log("Dropping old policies...");

  // Drop old policies
  await supabase.rpc('exec_sql', {
    sql: `DROP POLICY IF EXISTS "conversations_participant_select" ON public.conversations;`
  });
  await supabase.rpc('exec_sql', {
    sql: `DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;`
  });
  await supabase.rpc('exec_sql', {
    sql: `DROP POLICY IF EXISTS "messages_select_participants" ON public.messages;`
  });
  await supabase.rpc('exec_sql', {
    sql: `DROP POLICY IF EXISTS "messages_insert_participant" ON public.messages;`
  });

  console.log("Creating new policies...");

  // Create new policies
  await supabase.rpc('exec_sql', {
    sql: `CREATE POLICY "conversations_participant_select" ON public.conversations FOR SELECT USING (auth.uid() = ANY(participants));`
  });
  await supabase.rpc('exec_sql', {
    sql: `CREATE POLICY "conversations_insert" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = ANY(participants));`
  });
  await supabase.rpc('exec_sql', {
    sql: `CREATE POLICY "messages_select_participants" ON public.messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() = ANY(c.participants)));`
  });
  await supabase.rpc('exec_sql', {
    sql: `CREATE POLICY "messages_insert_participant" ON public.messages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() = ANY(c.participants)));`
  });

  console.log("RLS policies fixed!");
}

fixRLS().catch(console.error);
