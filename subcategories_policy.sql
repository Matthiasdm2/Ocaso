-- Voeg deze policy toe in Supabase SQL Editor:
CREATE POLICY "subcategories_write_auth" ON subcategories
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);
