-- Preserve Yjs CRDT item identifiers across backend restarts. The plain-text
-- code column remains available for history views and legacy snapshots.
ALTER TABLE "CodeSnapshot" ADD COLUMN "yState" BYTEA;
