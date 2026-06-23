# Backend

NestJS Fastify API for the Enterprise File Repository.

## Database

Prisma schema:

```text
apps/backend/prisma/schema.prisma
```

Prisma CLI config:

```text
../../prisma.config.ts
```

Generate Prisma client:

```bash
npm run prisma:generate -w @filerepo/backend
```

Run migration:

```bash
npm run prisma:migrate -w @filerepo/backend
```

Seed initial RBAC/admin data:

```bash
npm run prisma:seed -w @filerepo/backend
```

Default seeded admin:

```text
Email: admin@company.com
Password: Admin@12345
```

Set `SEED_ADMIN_PASSWORD` before seeding to override the default.

Prisma 7 uses the PostgreSQL driver adapter. The runtime connection is configured in `src/modules/database/prisma.service.ts`.

## Auth And RBAC

Protected endpoints use:

- `AuthGuard` for bearer token verification.
- `RequirePermissions(...)` for permission metadata.
- `PermissionsGuard` for database-backed permission checks.

`SUPER_ADMIN` bypasses permission checks by design.
