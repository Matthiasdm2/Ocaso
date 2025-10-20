-- Comprehensive RLS policies for Ocaso admin portal
-- Enable RLS on all tables and create appropriate policies
-- Admins bypass RLS via service role, regular users follow policies

-- Profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read profiles (for avatars, names, etc.)
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT TO authenticated USING (true);

-- Allow users to insert their own profile
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Allow users to update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Listings table
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read active listings (public)
DROP POLICY IF EXISTS "listings_select_public" ON listings;
CREATE POLICY "listings_select_public" ON listings FOR SELECT USING (status = 'actief');

-- Allow authenticated users to read their own listings (including drafts)
DROP POLICY IF EXISTS "listings_select_own" ON listings;
CREATE POLICY "listings_select_own" ON listings FOR SELECT TO authenticated USING (seller_id = auth.uid());

-- Allow authenticated users to insert listings
DROP POLICY IF EXISTS "listings_insert_authenticated" ON listings;
CREATE POLICY "listings_insert_authenticated" ON listings FOR INSERT TO authenticated WITH CHECK (seller_id = auth.uid());

-- Allow owners to update their listings
DROP POLICY IF EXISTS "listings_update_own" ON listings;
CREATE POLICY "listings_update_own" ON listings FOR UPDATE TO authenticated USING (seller_id = auth.uid()) WITH CHECK (seller_id = auth.uid());

-- Allow owners to delete their listings
DROP POLICY IF EXISTS "listings_delete_own" ON listings;
CREATE POLICY "listings_delete_own" ON listings FOR DELETE TO authenticated USING (seller_id = auth.uid());

-- Categories table
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read categories
DROP POLICY IF EXISTS "categories_select_all" ON categories;
CREATE POLICY "categories_select_all" ON categories FOR SELECT USING (true);

-- Subcategories table
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read subcategories
DROP POLICY IF EXISTS "subcategories_select_all" ON subcategories;
CREATE POLICY "subcategories_select_all" ON subcategories FOR SELECT USING (true);

-- Bids table
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- Allow bidders to read their own bids
DROP POLICY IF EXISTS "bids_select_own" ON bids;
CREATE POLICY "bids_select_own" ON bids FOR SELECT TO authenticated USING (bidder_id = auth.uid());

-- Allow authenticated users to insert bids
DROP POLICY IF EXISTS "bids_insert_authenticated" ON bids;
CREATE POLICY "bids_insert_authenticated" ON bids FOR INSERT TO authenticated WITH CHECK (bidder_id = auth.uid());

-- Allow bidders to update their own bids
DROP POLICY IF EXISTS "bids_update_own" ON bids;
CREATE POLICY "bids_update_own" ON bids FOR UPDATE TO authenticated USING (bidder_id = auth.uid()) WITH CHECK (bidder_id = auth.uid());

-- Favorites table
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own favorites
DROP POLICY IF EXISTS "favorites_select_own" ON favorites;
CREATE POLICY "favorites_select_own" ON favorites FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Allow users to insert their own favorites
DROP POLICY IF EXISTS "favorites_insert_own" ON favorites;
CREATE POLICY "favorites_insert_own" ON favorites FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Allow users to delete their own favorites
DROP POLICY IF EXISTS "favorites_delete_own" ON favorites;
CREATE POLICY "favorites_delete_own" ON favorites FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Conversations table
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Allow participants to read their conversations
DROP POLICY IF EXISTS "conversations_select_participants" ON conversations;
CREATE POLICY "conversations_select_participants" ON conversations FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- Allow authenticated users to insert conversations (for new chats)
DROP POLICY IF EXISTS "conversations_insert_authenticated" ON conversations;
CREATE POLICY "conversations_insert_authenticated" ON conversations FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid());

-- Messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow conversation participants to read messages
DROP POLICY IF EXISTS "messages_select_participants" ON messages;
CREATE POLICY "messages_select_participants" ON messages FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
  )
);

-- Allow participants to insert messages
DROP POLICY IF EXISTS "messages_insert_participants" ON messages;
CREATE POLICY "messages_insert_participants" ON messages FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
  )
);

-- Orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Allow buyers and sellers to read their orders
DROP POLICY IF EXISTS "orders_select_participants" ON orders;
CREATE POLICY "orders_select_participants" ON orders FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- Allow authenticated users to insert orders
DROP POLICY IF EXISTS "orders_insert_authenticated" ON orders;
CREATE POLICY "orders_insert_authenticated" ON orders FOR INSERT TO authenticated WITH CHECK (buyer_id = auth.uid());

-- Reviews table
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read reviews
DROP POLICY IF EXISTS "reviews_select_all" ON reviews;
CREATE POLICY "reviews_select_all" ON reviews FOR SELECT USING (true);

-- Allow reviewers to insert reviews
DROP POLICY IF EXISTS "reviews_insert_reviewer" ON reviews;
CREATE POLICY "reviews_insert_reviewer" ON reviews FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid());

-- User subscriptions table
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own subscriptions
DROP POLICY IF EXISTS "user_subscriptions_select_own" ON user_subscriptions;
CREATE POLICY "user_subscriptions_select_own" ON user_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Allow users to insert their own subscriptions
DROP POLICY IF EXISTS "user_subscriptions_insert_own" ON user_subscriptions;
CREATE POLICY "user_subscriptions_insert_own" ON user_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Allow users to update their own subscriptions
DROP POLICY IF EXISTS "user_subscriptions_update_own" ON user_subscriptions;
CREATE POLICY "user_subscriptions_update_own" ON user_subscriptions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
