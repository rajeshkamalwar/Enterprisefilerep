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

1. Database schema and migrations.
2. Real auth with password hashing and revocable sessions.
3. RBAC persistence and backend guards.
4. Local storage adapter and file metadata.
5. Multipart upload plus quarantine flow.
6. ClamAV worker and scan status transitions.
7. Audit log writer.
8. SMTP queue and templates.
9. Search indexing.
10. Production hardening for Hostinger VPS.
