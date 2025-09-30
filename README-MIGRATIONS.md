Migrations helper

This project includes SQL migration files in `supabase/migrations` and a helper script to apply them to your Supabase database.

Usage (local):

1) Ensure you have either the Supabase CLI installed and logged in, or `psql` available and `DATABASE_URL` set in your environment.

2) Run the helper script:

```bash
npm run migrate:apply
```

This will run each `*.sql` in `supabase/migrations` in alphanumeric order. The script will prefer the `supabase` CLI if available; otherwise it will use `psql` and `DATABASE_URL`.

Notes:
- The migration scripts include `0001_create_listing_views.sql` and `0002_increment_listing_views.sql`.
- Always review migrations before applying to production.
