# Enterprise File Repository

Enterprise ERP-style internal file repository for multinational company use.

The source-of-truth BRD is [`FILE_REPOSITORY_BRD.md`](./FILE_REPOSITORY_BRD.md).

## Current Milestone

This repository now contains an Enterprise MVP implementation path:

- Next.js ERP-style frontend with sidebar modules and URL-persisted module state.
- NestJS API with auth, RBAC, users, departments, folders, files, reports, audit, SMTP, health, backup, scan, and search administration endpoints.
- Prisma/PostgreSQL persistence with seeded roles, permissions, admin user, folders, and email templates.
- Redis/BullMQ workers for scan and email queues.
- ClamAV integration for antivirus scanning.
- Meilisearch integration with an explicit reindex worker.
- Docker Compose infrastructure for local development and Hostinger VPS-style production deployment.
- Nginx, PM2 fallback, production env template, smoke test, and acceptance checklist.

## Local Development

```bash
npm install
npm run dev
```

Frontend:

```text
http://localhost:3000
```

Backend:

```text
http://localhost:4000/api/v1/health
```

After the database milestone, backend protected routes require PostgreSQL, Prisma migrations, seeded RBAC data, and a bearer token.

## Infrastructure

```bash
docker compose up -d postgres redis meilisearch clamav
```

## Production Handoff

- Production guide: [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)
- Production env template: [`docs/env.production.example`](./docs/env.production.example)
- Nginx reverse proxy: [`config/nginx/filerepo.conf`](./config/nginx/filerepo.conf)
- Client UAT checklist: [`docs/ACCEPTANCE_CHECKLIST.md`](./docs/ACCEPTANCE_CHECKLIST.md)
- Smoke test:

```bash
API_BASE=http://localhost:4000/api/v1 SMOKE_EMAIL=admin@company.com SMOKE_PASSWORD=Admin@12345 npm run smoke:test
```

## Product Principle

The app should feel like an enterprise ERP module, not a consumer drive clone. Daily workflows should remain simple while admin, RBAC, audit, storage, SMTP, and reporting capabilities stay explicit and governed.
