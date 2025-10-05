-- Optie 1: Sta inserts toe voor authenticated users (aanbevolen)
CREATE POLICY "Allow insert for authenticated users" ON subcategories
FOR INSERT TO authenticated
WITH CHECK (true);

-- Optie 2: Schakel RLS helemaal uit voor subcategories (minder veilig)
-- ALTER TABLE subcategories DISABLE ROW LEVEL SECURITY;
