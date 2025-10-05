-- create_shop_views_table.sql
-- Creates a table to track shop views for trending shops functionality

-- Create shop_views table
CREATE TABLE IF NOT EXISTS public.shop_views (
    id BIGSERIAL PRIMARY KEY,
    shop_slug TEXT NOT NULL,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    viewer_ip INET,
    user_agent TEXT,
    session_id TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS shop_views_shop_slug_idx ON public.shop_views (shop_slug);
CREATE INDEX IF NOT EXISTS shop_views_viewed_at_idx ON public.shop_views (viewed_at);
-- Note: Removed weekly index due to DATE_TRUNC not being IMMUTABLE

-- Enable RLS
ALTER TABLE public.shop_views ENABLE ROW LEVEL SECURITY;

-- Create policy to allow inserts (we want to track views from anyone)
CREATE POLICY "Allow insert shop views" ON public.shop_views
    FOR INSERT WITH CHECK (true);

-- Create policy to allow reads for analytics (maybe restrict this later)
CREATE POLICY "Allow read shop views for service role" ON public.shop_views
    FOR SELECT USING (auth.role() = 'service_role');

-- Create a function to get trending shops for the current week (Monday to Sunday)
CREATE OR REPLACE FUNCTION get_trending_shops_this_week()
RETURNS TABLE (
    shop_slug TEXT,
    shop_name TEXT,
    view_count BIGINT,
    profile_id UUID
) AS $$
DECLARE
    week_start TIMESTAMP WITH TIME ZONE;
    week_end TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate the start of the current week (Monday)
    week_start := DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 day';
    -- Calculate the end of Sunday (end of day)
    week_end := DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days' + INTERVAL '1 day' - INTERVAL '1 second';

    RETURN QUERY
    SELECT
        p.shop_slug,
        p.shop_name,
        COUNT(sv.id)::BIGINT as view_count,
        p.id as profile_id
    FROM
        profiles p
    LEFT JOIN
        shop_views sv ON p.shop_slug = sv.shop_slug
        AND sv.viewed_at >= week_start
        AND sv.viewed_at <= week_end
    WHERE
        p.shop_slug IS NOT NULL
        AND p.shop_name IS NOT NULL
        AND p.is_business = true
    GROUP BY
        p.id, p.shop_slug, p.shop_name
    HAVING
        COUNT(sv.id) > 0
    ORDER BY
        view_count DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
