# Client Acceptance Checklist

Use this checklist for UAT before production sign-off.

## Access And Login

- Super admin can log in.
- Department admin can log in.
- Employee can log in.
- Invalid login is rejected and appears in audit logs.
- User status `INACTIVE` prevents login.

## ERP Navigation

- Sidebar module selection remains after refresh.
- Dashboard opens as the default module.
- Repository, Users, Departments, RBAC, Audit, Reports, SMTP, Settings, Backup, and System Health are reachable from the sidebar.
- Tables, filters, actions, and empty states are readable on laptop and desktop screens.

## Repository

- Folder tree loads.
- User can create a folder where permitted.
- User can upload a file where permitted.
- File metadata appears correctly.
- File preview opens for supported file types.
- File download works.
- Version history is visible.
- Restore version works for permitted users.
- Recycle-bin restore works for permitted users.
- Deleted files are not shown in normal repository views.

## RBAC

- Super admin can create and update roles.
- Super admin can assign permissions to roles.
- Department admin cannot assign super admin.
- Employee cannot access admin-only modules.
- Protected APIs return unauthorized or forbidden responses without the right token or permission.

## Users And Departments

- Super admin can create users.
- Super admin can deactivate users.
- Department admin can manage department-scoped users only.
- Department quotas and statuses are visible.
- User role and department assignments are displayed clearly.

## Audit And Compliance

- Login success and failure events are logged.
- File upload, download, delete, restore, and permission-sensitive actions are logged.
- Audit filters return expected results.
- Reports can be opened by authorized users.
- Unauthorized report access is blocked.

## SMTP And Notifications

- SMTP settings can be saved.
- SMTP test email is delivered.
- Email templates are editable.
- Delivery logs show queued, sent, and failed states.
- Email worker processes queued messages.

## Scanning And Search

- ClamAV health check is visible.
- Pending scans can be run.
- Scan queue status is visible.
- Meilisearch health check is visible.
- Search reindex command completes.

## Backup And Restore Readiness

- Manual backup command creates a timestamped backup directory.
- Backup list appears in the admin API.
- PostgreSQL dump command runs successfully.
- Storage folder is included in the operational backup process.
- Restore procedure has been rehearsed on a non-production machine.

## Production Operations

- HTTPS is active.
- HTTP redirects to HTTPS.
- API is not publicly exposed except through Nginx.
- Rate limiting is enabled.
- CORS allows only the production frontend domain.
- Real secrets are not committed.
- Docker containers restart automatically.
- Smoke test passes against the production URL.
