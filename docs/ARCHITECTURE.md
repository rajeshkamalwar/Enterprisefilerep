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

The repository contains a runnable enterprise MVP with persisted users, departments, RBAC, repository folders/files, audit logs, reports, SMTP settings/templates/logs, queue workers, antivirus scan execution, local storage, backup metadata snapshots, and Meilisearch reindexing.

## Production Operations

- Local development compose: [`../docker-compose.yml`](../docker-compose.yml)
- Hostinger/VPS compose: [`../docker-compose.prod.yml`](../docker-compose.prod.yml)
- Deployment runbook: [`./DEPLOYMENT.md`](./DEPLOYMENT.md)
- Acceptance checklist: [`./ACCEPTANCE_CHECKLIST.md`](./ACCEPTANCE_CHECKLIST.md)

## Remaining Enterprise Enhancements

1. Add full-text content extraction for Office/PDF preview search.
2. Add encrypted offsite backup automation through Restic/Borg plus rclone.
3. Add refresh-token revocation and password reset flows.
4. Add SSO/SAML or Microsoft Entra ID for larger enterprise rollout.
5. Add observability stack if the client needs SLA-style monitoring.
