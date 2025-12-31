-- Add icon_key column to categories table
-- This replaces icon_url for consistent icon rendering

ALTER TABLE categories ADD COLUMN icon_key TEXT;

-- Add index for faster category queries
CREATE INDEX idx_categories_active_sort ON categories(is_active, sort_order);

-- Migrate existing icon_url to icon_key (if any exist)
-- This is a simple mapping - in production, you'd map actual URLs to keys
UPDATE categories SET icon_key = 'car' WHERE slug = 'autos';
UPDATE categories SET icon_key = 'motorbike' WHERE slug = 'motos';
UPDATE categories SET icon_key = 'home' WHERE slug = 'huizen';
UPDATE categories SET icon_key = 'briefcase' WHERE slug = 'vacatures';
UPDATE categories SET icon_key = 'tool' WHERE slug = 'bouw';
UPDATE categories SET icon_key = 'device-desktop' WHERE slug = 'computers';
UPDATE categories SET icon_key = 'device-mobile' WHERE slug = 'phones-tablets';
UPDATE categories SET icon_key = 'shirt' WHERE slug = 'kleding';
UPDATE categories SET icon_key = 'ball-basketball' WHERE slug = 'sport';
UPDATE categories SET icon_key = 'baby-carriage' WHERE slug = 'baby';
UPDATE categories SET icon_key = 'paw' WHERE slug = 'dieren';
UPDATE categories SET icon_key = 'ticket' WHERE slug = 'tickets';
UPDATE categories SET icon_key = 'wrench' WHERE slug = 'diensten';
UPDATE categories SET icon_key = 'leaf' WHERE slug = 'tuin-terras';
UPDATE categories SET icon_key = 'tv' WHERE slug = 'elektronica';
UPDATE categories SET icon_key = 'gamepad' WHERE slug = 'games';
UPDATE categories SET icon_key = 'boat' WHERE slug = 'boten';
UPDATE categories SET icon_key = 'dots' WHERE icon_key IS NULL; -- fallback
