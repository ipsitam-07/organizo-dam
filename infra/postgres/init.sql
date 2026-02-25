CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  RAISE NOTICE 'dam_platform database initialised. Run migrations to create tables.';
END $$;
