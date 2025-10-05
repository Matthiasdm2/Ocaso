-- add_test_shop_data.sql
-- Adds some test data to verify trending shops functionality

-- First, let's create a test business profile if it doesn't exist
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  is_business,
  shop_name,
  shop_slug
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'test-shop@example.com',
  'Test Shop Owner',
  true,
  'Test Winkel',
  'test-winkel'
) ON CONFLICT (id) DO NOTHING;

-- Add some test shop views for the current week (Monday to Sunday)
INSERT INTO public.shop_views (shop_slug, viewed_at, viewer_ip, user_agent, session_id) VALUES
('test-winkel', NOW() - INTERVAL '6 days', '192.168.1.1', 'Mozilla/5.0 Test Browser', 'session-1'), -- Monday
('test-winkel', NOW() - INTERVAL '2 days', '192.168.1.2', 'Mozilla/5.0 Test Browser', 'session-2'), -- Friday
('test-winkel', NOW() - INTERVAL '1 day', '192.168.1.3', 'Mozilla/5.0 Test Browser', 'session-3'), -- Saturday
('test-winkel', NOW() - INTERVAL '3 hours', '192.168.1.6', 'Mozilla/5.0 Test Browser', 'session-6'); -- Today (Sunday)

-- Add another test shop
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  is_business,
  shop_name,
  shop_slug
) VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'another-shop@example.com',
  'Another Shop Owner',
  true,
  'Nog Een Winkel',
  'nog-een-winkel'
) ON CONFLICT (id) DO NOTHING;

-- Add fewer views for the second shop (spread over the week)
INSERT INTO public.shop_views (shop_slug, viewed_at, viewer_ip, user_agent, session_id) VALUES
('nog-een-winkel', NOW() - INTERVAL '5 days', '192.168.1.4', 'Mozilla/5.0 Test Browser', 'session-4'), -- Tuesday
('nog-een-winkel', NOW() - INTERVAL '1 day', '192.168.1.5', 'Mozilla/5.0 Test Browser', 'session-5'), -- Saturday
('nog-een-winkel', NOW() - INTERVAL '2 hours', '192.168.1.7', 'Mozilla/5.0 Test Browser', 'session-7'); -- Today
