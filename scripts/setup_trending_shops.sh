#!/bin/bash
# setup_trending_shops.sh
# Sets up trending shops functionality by running migrations and adding test data

echo "Setting up trending shops functionality..."

# Run the main migration
echo "Running shop_views table migration..."
psql "$DATABASE_URL" -f scripts/sql/create_shop_views_table.sql

if [ $? -eq 0 ]; then
    echo "Migration successful!"
else
    echo "Migration failed!"
    exit 1
fi

# Add test data
echo "Adding test data..."
psql "$DATABASE_URL" -f scripts/sql/add_test_shop_data.sql

if [ $? -eq 0 ]; then
    echo "Test data added successfully!"
    echo ""
    echo "Trending shops setup complete!"
    echo "Trending shops are calculated from Monday to Sunday each week."
    echo "You can now:"
    echo "1. Visit /explore to see trending shops"
    echo "2. Visit /api/debug-shops to check the data"
    echo "3. Visit /shop/test-winkel to test shop view tracking"
else
    echo "Failed to add test data!"
    exit 1
fi
