# Enterprise File Repository

Enterprise ERP-style internal file repository for multinational company use.

The source-of-truth BRD is [`FILE_REPOSITORY_BRD.md`](./FILE_REPOSITORY_BRD.md).

## Current Milestone

This repository starts with the Enterprise MVP foundation:

- Next.js frontend shell.
- NestJS backend shell.
- RBAC/auth/health API skeleton.
- Docker Compose infrastructure for PostgreSQL, Redis, Meilisearch, ClamAV, and app services.
- Environment variable template.

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

## Infrastructure

```bash
docker compose up -d postgres redis meilisearch clamav
```

## Product Principle

The app should feel like an enterprise ERP module, not a consumer drive clone. Daily workflows should remain simple while admin, RBAC, audit, storage, SMTP, and reporting capabilities stay explicit and governed.
