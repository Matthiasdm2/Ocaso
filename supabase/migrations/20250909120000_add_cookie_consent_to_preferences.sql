-- Add cookieConsent sub-object to preferences JSON if missing
-- This is idempotent: only updates rows where key does not yet exist.
update profiles
set preferences = jsonb_set(
  coalesce(preferences, '{}'::jsonb),
  '{cookieConsent}',
  jsonb_build_object(
    'functional', true,
    'analytics', false,
    'marketing', false,
    'updatedAt', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SSZ')
  )
)
where (preferences->'cookieConsent') is null;

-- Optionally enforce a JSON schema later via a check constraint (Postgres 15+ with extensions) – skipped for portability.

comment on column profiles.preferences is 'User preferences incl. language, newsletter, cookieConsent (functional|analytics|marketing).';