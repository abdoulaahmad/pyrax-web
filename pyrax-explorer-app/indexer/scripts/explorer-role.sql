-- SPDX-License-Identifier: LicenseRef-Proprietary
--
-- Least-privilege database role for the PYRAX Explorer indexer.
--
-- WHY: the indexer + SSR data layer are internet-exposed and only need read + INSERT/UPDATE/DELETE on
-- their OWN explorer tables. Connecting as the DigitalOcean Managed-Postgres SUPERUSER (`doadmin`) means
-- any SQL-execution flaw, dependency compromise, or credential leak in this process would grant control
-- of the ENTIRE shared cluster (every site DB) — not just the explorer schema. This role is scoped to a
-- single database (`pyrax_explorer` here) with NO superuser / CREATEDB / CREATEROLE and no reach into
-- other databases. Point EXPLORER_DATABASE_URL at THIS role (never doadmin) in production, and keep
-- DATABASE_CA pinning enabled so the TLS link to the cluster is verified.
--
-- APPLY (once, as an admin such as doadmin — this is the only step that needs elevated rights):
--   psql "$ADMIN_DATABASE_URL" -v role_pw="'CHANGE_ME_STRONG'" -f indexer/scripts/explorer-role.sql
-- then set EXPLORER_DATABASE_URL to:
--   postgresql://pyrax_explorer:CHANGE_ME_STRONG@<cluster-host>:25060/pyrax_explorer?sslmode=require
-- and provide DATABASE_CA (the cluster CA PEM) so the cert is verified.
--
-- Adjust the database name below if the explorer DB is named differently.

\set explorer_db pyrax_explorer

-- 1) The role: login only, NO elevated attributes.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pyrax_explorer') THEN
    EXECUTE format('CREATE ROLE pyrax_explorer LOGIN PASSWORD %L', current_setting('role_pw', true));
  END IF;
END $$;

ALTER ROLE pyrax_explorer NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

-- 2) Scope it to the explorer database only. (Run the GRANTs below while connected TO that database.)
GRANT CONNECT ON DATABASE :"explorer_db" TO pyrax_explorer;

-- 3) In the explorer database, let the role use + own its schema so init()'s CREATE TABLE works, and
--    grant DML on all current + future tables/sequences in `public`. No rights on other databases.
--    (Connect: \c :explorer_db  — DO Managed Postgres uses the `public` schema for the explorer tables.)
GRANT USAGE, CREATE ON SCHEMA public TO pyrax_explorer;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pyrax_explorer;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pyrax_explorer;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pyrax_explorer;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO pyrax_explorer;

-- Explicitly deny anything cluster-wide: the role has no membership in any admin/other-db role.
-- (Verify with:  SELECT rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname='pyrax_explorer';)
