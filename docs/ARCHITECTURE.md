# Architecture Overview

This document summarizes the first implementation milestone. The detailed product source of truth remains [`../FILE_REPOSITORY_BRD.md`](../FILE_REPOSITORY_BRD.md).

## First Milestone Goal

Create a runnable Enterprise MVP foundation:

- ERP-style frontend shell.
- Versioned NestJS API.
- Health, auth, RBAC, SMTP, reports, access request, file, and admin API scaffolds.
- Docker Compose infrastructure for local and VPS deployment planning.

## Applications

```text
apps/
  frontend/   Next.js ERP interface
  backend/    NestJS API
```

## Runtime Services

```text
frontend -> backend -> PostgreSQL
                    -> Redis
                    -> Meilisearch
                    -> ClamAV
                    -> Local storage adapter
                    -> SMTP provider
```

## Current State

The repository currently contains the foundation only. Endpoints that mention storage, upload, scan queues, token revocation, and email delivery are intentionally scaffolded. The next milestones should replace demo responses with real persistence and background jobs.

## Recommended Next Milestones

1. Run the first database migration and seed against Postgres.
2. Add revocable refresh-token sessions.
3. Run and verify BullMQ scan worker against Docker Redis and ClamAV.
4. Run and verify SMTP email worker against a real SMTP provider.
5. Audit log expansion for remaining admin events.
6. Search indexing.
7. Production hardening for Hostinger VPS.
