# Refactor Storage Processing

## Pain points

- Have to put query for init storage and sync (multiple times)
- No order of processing (fks require processing order)
- Sync and init each storage separately

## Solution

- Central table in Oracle with storage definitions
  - Table name instead of query
  - PK col
  - TS col
  - Depends on table (e.g. movie_cast depends on movies and actors table. So, movies and actors should be processed first)
  - Column options json (exclude, readonly, blob specs like image etc.)
- Sync that to the offline storage
- Only init storages da and sync all
