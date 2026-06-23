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

The seed also creates a root folder named `Company Repository`.

## Repository Storage

Version 1 stores uploads in local quarantine storage:

```text
LOCAL_STORAGE_ROOT=./storage
MAX_UPLOAD_BYTES=262144000
```

Uploaded files are written with generated storage keys, while the original filename is stored only as metadata. Downloads are blocked until the current file version has scan status `CLEAN`.

Create a folder:

```bash
curl -X POST "http://localhost:4000/api/v1/folders" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Finance FY 2026",
    "parentId": "ROOT_FOLDER_ID"
  }'
```

Upload a file to quarantine:

```bash
curl -X POST "http://localhost:4000/api/v1/files/upload" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -F "folderId=FOLDER_ID" \
  -F "classification=INTERNAL" \
  -F "file=@./sample.pdf"
```

The upload response returns metadata with `scanStatus=PENDING`. The ClamAV worker milestone will later move clean files from quarantine into available storage.

## Antivirus Scanning

Run the pending scan worker:

```bash
npm run worker:scan -w @filerepo/backend
```

Run the automatic queue worker:

```bash
npm run worker:scan-queue -w @filerepo/backend
```

Uploads enqueue a BullMQ job in Redis. The queue worker consumes scan jobs and scans file versions through ClamAV `INSTREAM`.

The one-shot worker scans `PENDING` and `FAILED` file versions directly and is useful for retries or maintenance:

```bash
npm run worker:scan -w @filerepo/backend
```

Clean files:

- Are marked `CLEAN`.
- Move from `quarantine/` to `originals/`.
- Become downloadable.

Infected files:

- Are marked `INFECTED`.
- Stay unavailable for download.
- Create an audit log entry.

Failed scans:

- Are marked `FAILED`.
- Can be retried by running the worker again.

Manual admin trigger:

```bash
curl -X POST "http://localhost:4000/api/v1/admin/scans/run-pending" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"limit": 25}'
```

Queue status:

```bash
curl -X GET "http://localhost:4000/api/v1/admin/scans/queue" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

## Auth And RBAC

Protected endpoints use:

- `AuthGuard` for bearer token verification.
- `RequirePermissions(...)` for permission metadata.
- `PermissionsGuard` for database-backed permission checks.

`SUPER_ADMIN` bypasses permission checks by design.
