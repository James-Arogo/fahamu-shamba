# SQLite to PostgreSQL Migration Plan (Fahamu Shamba)

This plan defines a safe migration path from SQLite to PostgreSQL once concurrent writes and workload complexity outgrow SQLite.

## 1. Migration Trigger Criteria

Migrate when one or more are consistently true:
- Sustained write concurrency causes frequent `SQLITE_BUSY`/`SQLITE_LOCKED` retries.
- P95 API latency worsens under normal peak traffic.
- Backup/restore windows become too long for operational needs.
- You need stronger transactional guarantees across multiple services.

## 2. Phase 1: Compatibility and Abstraction

1. Introduce a DB adapter layer (`db-client`) with methods used by routes/services:
- `run(sql, params)`
- `get(sql, params)`
- `all(sql, params)`
- transactional helper (`withTransaction(fn)`)

2. Keep route logic unchanged; swap direct DB imports to adapter usage.

3. Add SQL compatibility rules:
- Replace SQLite-specific datetime expressions where needed.
- Normalize boolean handling (`0/1` in SQLite vs `BOOLEAN` in PostgreSQL).

## 3. Phase 2: PostgreSQL Schema

1. Create PostgreSQL DDL matching existing tables:
- `farmers`
- `predictions`
- `feedback`
- `historical_observations`
- profile/admin tables used by the system

2. Preserve constraints and indexes:
- unique keys (e.g., phone/email/signature)
- foreign keys
- pagination and context indexes

3. Maintain model/versioning columns (`model_version`) and timestamps.

## 4. Phase 3: Data Migration

Preferred path:
1. Put system in maintenance mode (or dual-write for zero-downtime later).
2. Export SQLite data to CSV/JSON by table.
3. Import into PostgreSQL in dependency order:
- parent tables first (`farmers`, admin/profile tables)
- then `predictions`
- then `feedback`
- then `historical_observations`

4. Validate counts and key aggregates:
- row counts per table
- latest timestamps
- sample recommendation metrics parity

## 5. Phase 4: Dual-Read Validation (Recommended)

1. Add feature flag:
- `DB_ENGINE=sqlite|postgres`

2. In staging:
- run reads against PostgreSQL
- compare with SQLite for critical endpoints:
  - `/api/recommend`
  - `/api/stats`
  - `/api/recommendation-engine/metrics`
  - `/api/predictions`

3. Verify performance:
- P50/P95 latency
- error rate
- connection pool usage

## 6. Phase 5: Production Cutover

1. Take final SQLite backup.
2. Freeze writes briefly.
3. Run final incremental sync.
4. Switch `DB_ENGINE=postgres` and deploy.
5. Unfreeze traffic and monitor for 24-48 hours.

## 7. Rollback Plan

If critical issues occur:
1. Re-enable maintenance mode.
2. Switch `DB_ENGINE=sqlite`.
3. Restore last known-good SQLite backup if needed.
4. Investigate, patch, and rerun staging validation before retry.

## 8. Operational Requirements for PostgreSQL

- Use managed PostgreSQL or hardened self-hosted instance.
- Enable daily logical backups + WAL/PITR strategy.
- Configure connection pooling.
- Add migration tooling (recommended: Knex or Prisma migrations).
- Add health checks and replication lag monitoring (if replicas are used).

## 9. Minimal Environment Variables

- `DB_ENGINE=postgres`
- `PGHOST`
- `PGPORT`
- `PGDATABASE`
- `PGUSER`
- `PGPASSWORD`
- `PGSSLMODE` (if required by host)

## 10. Definition of Done

Migration is complete when:
- all core endpoints run on PostgreSQL,
- metrics parity is validated,
- backups/restores are tested,
- rollback path is verified,
- and production SLOs are met.
