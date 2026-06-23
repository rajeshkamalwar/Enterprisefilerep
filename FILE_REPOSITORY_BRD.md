# Business Requirements Document: Enterprise File Repository

Version: 1.1  
Date: 2026-06-23  
Project: Enterprise ERP-Style Internal File Repository  
Target Environment: Hostinger VPS initially, with future S3-compatible storage support  
Primary Audience: Business stakeholders, project managers, architects, developers, QA, DevOps, security reviewers

---

## 1. Executive Summary

The client requires an internal enterprise file repository for company employees working across India and international locations. The system will allow authorized users to securely upload, organize, search, preview, download, version, share, and manage company files.

This is not a simple file upload portal. The product must look, feel, and behave like an enterprise ERP module: structured navigation, role-aware dashboards, dense operational tables, approval-ready workflows, auditability, admin controls, reporting, and disciplined master-data management. Because the client is a multinational company with more than 100 employees, the system must be designed as a secure document management and governance platform with role-based access control, audit logs, antivirus scanning, version history, backup strategy, SMTP email notifications, and future scalability.

The first production version will run on a Hostinger VPS. However, the architecture must avoid hard dependency on local VPS disk storage. The system must include a storage abstraction so files can later be moved to S3-compatible object storage such as AWS S3, Cloudflare R2, Wasabi, Backblaze B2, or MinIO without rewriting the full application.

---

## 2. Business Goals

The system must help the company:

- Centralize internal company files in one controlled platform.
- Reduce file duplication across personal drives, email attachments, and chat messages.
- Ensure only authorized employees can access sensitive documents.
- Track who uploaded, downloaded, edited, deleted, shared, or restored files.
- Organize files by department, project, country, client, category, and confidentiality level.
- Support employees working from multiple countries and time zones.
- Protect files through authentication, authorization, encryption, virus scanning, backups, and audit trails.
- Provide a long-term foundation for document governance and compliance.
- Provide an ERP-level user experience that feels suitable for internal company operations, not a consumer-style drive clone.
- Standardize document-related processes through controlled master data, roles, permissions, workflows, notifications, and reports.

---

## 3. Scope

### 3.1 In Scope For Version 1

- Secure login.
- User roles.
- User groups.
- Department-based access.
- Project-based folders.
- File upload.
- File download.
- Folder creation.
- Folder navigation.
- File rename.
- Folder rename.
- File move.
- Folder move.
- File delete using soft delete.
- Recycle bin.
- File restore.
- File preview for common file types.
- File version history.
- Replace file with new version.
- Search by metadata.
- Tags.
- File details page.
- Activity logs.
- Admin dashboard.
- Permission management.
- RBAC management with role, permission, group, and resource assignment screens.
- SMTP email configuration.
- Email notifications for security and file workflow events.
- ERP-style module navigation and operational UI.
- Storage usage tracking.
- Antivirus scanning.
- Upload quarantine before scan completion.
- Basic notification system.
- Daily backup process.
- VPS deployment using Docker Compose.

### 3.2 In Scope For Later Versions

- Single Sign-On using Microsoft Entra ID, Google Workspace, Okta, or Auth0.
- Multi-factor authentication.
- Full-text search inside PDF, Word, Excel, and PowerPoint documents.
- OCR for scanned PDFs and images.
- Approval workflows.
- Document expiry reminders.
- Legal hold.
- Retention policies.
- Watermarking confidential documents.
- External sharing with vendors or clients.
- Expiring public links.
- Regional storage.
- Object storage migration.
- Mobile app.
- Desktop sync client.
- Advanced analytics.
- Data loss prevention.

### 3.3 Out Of Scope For Version 1

- Real-time collaborative document editing like Google Docs.
- Video streaming optimization.
- CAD file rendering.
- Blockchain notarization.
- Native desktop sync application.
- Full enterprise DLP engine.
- Built-in email server.
- Built-in chat or messaging platform.

---

### 3.4 Enterprise Readiness Levels

The system should be planned in maturity levels so the client understands what will be delivered first and what will come later.

### Level 1: Enterprise MVP

This is the recommended first release on Hostinger VPS.

Includes:

- ERP-style authenticated interface.
- Secure login.
- RBAC.
- Department and project folders.
- File upload and download.
- File preview.
- Antivirus scanning.
- File versioning.
- Recycle bin.
- Audit logs.
- SMTP notifications.
- Admin dashboard.
- Daily offsite backups.
- Monitoring.

### Level 2: Enterprise Standard

This is the recommended second stage.

Includes:

- SSO.
- MFA.
- Full-text document search.
- OCR.
- Approval workflows.
- Access request workflow.
- Periodic access review.
- Advanced reports.
- Object storage migration.
- Better disaster recovery.

### Level 3: Enterprise Advanced

This is for high-compliance or large-scale future needs.

Includes:

- High-availability infrastructure.
- Multi-region storage.
- Legal hold.
- Retention automation.
- Data loss prevention.
- Confidential watermarking.
- External secure sharing.
- SIEM integration.
- SCIM user provisioning.
- Advanced compliance exports.

### Important VPS Limitation

Hostinger VPS can support a strong Enterprise MVP, but a single VPS is not a full high-availability enterprise platform by itself. The BRD must clearly separate:

- What can be safely delivered on the current VPS.
- What requires object storage.
- What requires managed cloud services.
- What requires multi-server or high-availability architecture.

---

## 4. Stakeholders

### 4.1 Business Stakeholders

- Company management.
- Department heads.
- HR team.
- Finance team.
- Legal team.
- IT team.
- Compliance team.
- Project managers.
- Country managers.

### 4.2 System Users

- Super admin.
- Company admin.
- Department admin.
- Project manager.
- Employee.
- Viewer.
- Auditor.

### 4.3 Technical Stakeholders

- Backend developers.
- Frontend developers.
- QA engineers.
- DevOps engineer.
- Security reviewer.
- Database administrator.
- Support team.

---

## 5. User Roles

### 5.1 Super Admin

The Super Admin has full control over the system.

Capabilities:

- Manage all users.
- Manage all departments.
- Manage all groups.
- Manage all roles.
- Access all folders and files unless legal restriction mode is introduced later.
- Assign permissions.
- View all audit logs.
- Manage storage settings.
- Manage backup settings.
- Restore deleted files.
- Configure system settings.
- View system health.
- Suspend users.
- Force password reset.

### 5.2 Company Admin

The Company Admin manages company-wide operational configuration.

Capabilities:

- Create departments.
- Manage user groups.
- Assign users to departments.
- Manage folder templates.
- View broad storage reports.
- View audit logs.
- Restore files within allowed scope.
- Manage file categories and tags.

### 5.3 Department Admin

The Department Admin manages files and users within a department.

Capabilities:

- Manage department folders.
- Upload department files.
- Delete department files based on permission.
- Restore department files.
- Assign department-level permissions.
- View department audit logs.
- Manage department tags.

### 5.4 Project Manager

The Project Manager manages project-level file spaces.

Capabilities:

- Create project folders.
- Upload project files.
- Invite internal users to project folders.
- Manage project-level permissions.
- Replace project documents with new versions.
- View project activity.

### 5.5 Employee

The Employee is a normal authenticated internal user.

Capabilities depend on permissions:

- View allowed folders.
- Upload files where permitted.
- Download files where permitted.
- Preview files where permitted.
- Edit metadata where permitted.
- Replace files where permitted.
- Delete files where permitted.

### 5.6 Viewer

The Viewer can only read or preview allowed files.

Capabilities:

- View folders.
- Preview files.
- Download only if download permission is granted.
- Cannot upload.
- Cannot edit.
- Cannot delete.
- Cannot share.

### 5.7 Auditor

The Auditor reviews activity and compliance records.

Capabilities:

- View audit logs.
- Export audit reports.
- View metadata.
- Cannot edit files.
- Cannot delete files.
- Cannot change permissions.

---

## 6. Permission Model

The system must support granular permissions.

### 6.1 Permission Actions

- View folder.
- View file.
- Preview file.
- Download file.
- Upload file.
- Create folder.
- Rename file.
- Rename folder.
- Move file.
- Move folder.
- Replace file.
- Delete file.
- Restore file.
- Permanently delete file.
- Share file internally.
- Manage permissions.
- View audit logs.
- Manage tags.
- Manage versions.

### 6.2 Permission Assignment Levels

Permissions may be assigned at:

- Global level.
- Department level.
- Project level.
- Folder level.
- File level.

### 6.3 Permission Inheritance

Folders should support inheritance.

Default behavior:

- Child folders inherit parent folder permissions.
- Files inherit containing folder permissions.
- Admins can break inheritance for sensitive folders or files.
- Permission changes must be logged.

### 6.4 Deny vs Allow

The system should support explicit deny only if necessary.

Recommended Version 1 approach:

- Use allow-based permissions.
- Avoid explicit deny in Version 1 to reduce complexity.
- If a user lacks a required permission, the action is blocked.

### 6.5 Ownership

Every file and folder must have:

- Created by user.
- Current owner user or group.
- Owning department.
- Optional owning project.

---

## 6.6 RBAC Requirements

RBAC means Role-Based Access Control. The system must use RBAC as the foundation for access control and must support group-based and resource-level permission assignment.

### RBAC Objects

The system must include:

- Users.
- Roles.
- Permissions.
- Groups.
- Departments.
- Projects.
- Resource permissions.
- Role permissions.
- Group memberships.

### RBAC Rules

- A user can have one or more roles.
- A user can belong to one or more groups.
- A role can contain many permissions.
- A group can receive permissions on departments, projects, folders, or files.
- A user can receive direct permissions only when required.
- Group permissions are preferred over direct user permissions.
- Direct user permissions should be used for exceptions only.
- Effective permissions must be calculated from role permissions, group permissions, and direct resource permissions.
- If a user has no permission for a resource, the resource must be hidden or blocked.
- Permission checks must happen on the backend for every protected action.
- Frontend hiding of buttons is not security.
- Every permission change must create an audit log entry.

### RBAC CRUD Requirements

Admin users must be able to:

- Create roles.
- Read role lists and role details.
- Update role names and descriptions.
- Deactivate roles.
- Assign permissions to roles.
- Remove permissions from roles.
- Create groups.
- Read group lists and group details.
- Update group names and descriptions.
- Deactivate groups.
- Add users to groups.
- Remove users from groups.
- Assign resource permissions to users, groups, and roles.
- Remove resource permissions from users, groups, and roles.
- View effective permissions for a selected user.
- View who has access to a selected folder or file.

### Recommended System Roles

- SUPER_ADMIN.
- COMPANY_ADMIN.
- DEPARTMENT_ADMIN.
- PROJECT_MANAGER.
- EMPLOYEE.
- VIEWER.
- AUDITOR.

### Recommended Permission Naming Convention

Use lowercase dot-separated permission keys:

```text
user.create
user.read
user.update
user.deactivate
role.create
role.read
role.update
role.deactivate
role.permission.assign
group.create
group.read
group.update
group.deactivate
group.member.add
group.member.remove
folder.create
folder.read
folder.update
folder.move
folder.delete
folder.restore
file.create
file.read
file.preview
file.download
file.update
file.move
file.delete
file.restore
file.version.create
file.version.read
file.version.restore
permission.assign
permission.remove
audit.read
audit.export
settings.read
settings.update
smtp.read
smtp.update
backup.read
backup.run
```

### Effective Permission Example

Example:

- User is an EMPLOYEE.
- User belongs to group Finance India.
- Finance India has file.download on the Finance folder.
- EMPLOYEE role has file.preview globally.

Result:

- User can preview allowed files through role permission.
- User can download files inside the Finance folder through group permission.
- User cannot download HR files unless another permission grants it.

---

## 7. Functional Requirements

## 7.1 Authentication

### Requirements

- Users must log in before accessing the repository.
- Passwords must be hashed using a strong algorithm such as Argon2 or bcrypt.
- Login attempts must be rate limited.
- Failed login attempts must be logged.
- Sessions must expire after inactivity.
- Users must be able to log out.
- Admins must be able to disable users.
- Admins must be able to force password reset.

### Future Requirement

- Support SSO using Microsoft Entra ID, Google Workspace, Okta, or Auth0.
- Support MFA.

---

## 7.2 User Management

### Requirements

- Admin can create users.
- Admin can edit users.
- Admin can deactivate users.
- Admin can assign roles.
- Admin can assign departments.
- Admin can assign users to groups.
- Admin can search users.
- Admin can view user activity.
- Admin can reset user password.

### User Fields

- User ID.
- Full name.
- Email.
- Employee code.
- Department.
- Country.
- Time zone.
- Role.
- Groups.
- Status.
- Created date.
- Last login date.

---

## 7.3 Group Management

### Requirements

- Admin can create groups.
- Admin can rename groups.
- Admin can delete groups.
- Admin can add users to groups.
- Admin can remove users from groups.
- Admin can assign permissions to groups.

### Example Groups

- HR India.
- HR Global.
- Finance India.
- Finance Global.
- Legal.
- Engineering.
- Sales.
- Project Alpha.
- Project Beta.
- Country Managers.
- External Auditors.

---

## 7.4 Department Management

### Requirements

- Admin can create departments.
- Admin can edit departments.
- Admin can deactivate departments.
- Department folders can be auto-created.
- Departments can have storage quotas.
- Departments can have default permissions.

### Example Departments

- Human Resources.
- Finance.
- Legal.
- Operations.
- Engineering.
- Sales.
- Marketing.
- Procurement.
- Management.
- IT.

---

## 7.5 Folder Management

### Requirements

- Users with permission can create folders.
- Users with permission can rename folders.
- Users with permission can move folders.
- Users with permission can delete folders.
- Folder deletion must be soft delete by default.
- Deleted folders must appear in recycle bin.
- Folder restore must restore child files and folders where possible.
- Folder names must be unique within the same parent folder.
- Folder names must support common business characters.
- Folder names must reject dangerous path characters.

### Folder Metadata

- Folder ID.
- Parent folder ID.
- Name.
- Path.
- Owner.
- Department.
- Project.
- Created by.
- Created date.
- Updated by.
- Updated date.
- Deleted status.
- Deleted by.
- Deleted date.

---

## 7.6 File Upload

### Requirements

- Users can upload files into folders where they have upload permission.
- Upload must support drag and drop.
- Upload must support file picker.
- Upload must show progress.
- Upload must enforce maximum file size.
- Upload must validate file type.
- Upload must store the file in quarantine until antivirus scan passes.
- Upload must calculate file checksum.
- Upload must create a metadata record.
- Upload must write audit log.
- Upload must show scan status.
- Upload must fail gracefully if disk space is insufficient.

### Upload States

- Pending.
- Uploading.
- Uploaded.
- Scanning.
- Clean.
- Infected.
- Failed.
- Rejected.

### Recommended Version 1 File Size Limits

- Default max file size: 250 MB.
- Admin-configurable max file size.
- Larger files can be supported later using chunked upload.

### Blocked File Types

Initial blocked extensions should include:

- `.exe`
- `.bat`
- `.cmd`
- `.msi`
- `.scr`
- `.vbs`
- `.js` where not required
- `.ps1`
- `.sh` where not required

The final list must be confirmed with the client.

---

## 7.7 File Storage

### Version 1 Storage

Files will be stored on the VPS filesystem.

Recommended structure:

```text
/srv/file-repository/
  originals/
  versions/
  thumbnails/
  previews/
  quarantine/
  temp/
  exports/
```

### Storage Rules

- Do not store uploaded files inside the application source directory.
- Do not expose storage directories directly through Nginx.
- Files must be accessed only through the backend authorization layer.
- Store physical files using generated IDs, not original filenames.
- Original filename must be stored only as metadata.
- Store checksum for each file version.
- Store MIME type.
- Store size in bytes.

### Future Storage

The backend must use a storage adapter interface.

Supported future adapters:

- Local disk.
- AWS S3.
- Cloudflare R2.
- Wasabi.
- Backblaze B2.
- MinIO.

---

## 7.8 File Download

### Requirements

- Users can download files only if they have download permission.
- Downloads must be logged.
- Download URLs must be temporary and signed where possible.
- Backend must verify permissions before serving file.
- Large downloads must stream from disk instead of loading into memory.
- Download filename must use original filename safely.

### Audit Fields

- User.
- File.
- File version.
- IP address.
- User agent.
- Timestamp.

---

## 7.9 File Preview

### Requirements

- Users can preview files only if they have preview permission.
- Preview should not require downloading original file.
- Preview generation should run in background.
- Preview status must be visible.

### Version 1 Preview Types

- PDF preview.
- Image preview.
- Text preview for `.txt`, `.csv`, `.log`.
- Basic Office file preview if technically feasible.

### Future Preview Types

- Word preview.
- Excel preview.
- PowerPoint preview.
- OCR preview.
- Video preview thumbnail.

---

## 7.10 File Versioning

### Requirements

- Users with replace permission can upload a new version of an existing file.
- Previous versions must remain available.
- Each version must have its own physical file.
- Each version must store checksum, size, uploader, upload date, and scan status.
- Users with permission can view version history.
- Users with permission can download previous versions.
- Users with permission can restore a previous version as the current version.

### Version Numbering

Recommended format:

- Version 1.
- Version 2.
- Version 3.

Optional future enhancement:

- Major/minor versioning such as 1.0, 1.1, 2.0.

---

## 7.11 File Metadata

### Required Metadata

- File ID.
- Folder ID.
- Original filename.
- Stored filename.
- Extension.
- MIME type.
- Size.
- Checksum.
- Current version.
- Owner.
- Department.
- Project.
- Tags.
- Classification.
- Created by.
- Created date.
- Updated by.
- Updated date.
- Deleted status.
- Deleted by.
- Deleted date.
- Scan status.

### Optional Metadata

- Description.
- Client name.
- Document date.
- Expiry date.
- Retention category.
- Confidentiality note.
- Custom fields.

---

## 7.12 Tags And Categories

### Requirements

- Admin can create global tags.
- Department admins can create department tags if allowed.
- Users with permission can assign tags to files.
- Tags must be searchable.
- Tags must be filterable.

### Example Tags

- Contract.
- Invoice.
- Policy.
- Employee Document.
- Client Deliverable.
- Legal.
- Confidential.
- Approved.
- Draft.

---

## 7.13 Document Classification

### Required Classification Levels

- Public Internal.
- Internal.
- Confidential.
- Restricted.

### Rules

- Every file should have a classification.
- Default classification should be Internal.
- Restricted files should require stricter permissions.
- Classification changes must be logged.

---

## 7.14 Search

### Version 1 Requirements

- Search by file name.
- Search by folder name.
- Search by tag.
- Search by uploader.
- Search by department.
- Search by project.
- Search by file type.
- Search by date range.
- Search by classification.

### Search Engine

Recommended for VPS:

- Meilisearch for Version 1 due to lower operational complexity.

Possible future upgrade:

- OpenSearch for heavier enterprise search, analytics, and full-text indexing.

### Future Requirements

- Full-text search inside documents.
- OCR text search.
- Synonym search.
- Saved searches.
- Search result highlighting.

---

## 7.15 Recycle Bin

### Requirements

- File delete must be soft delete by default.
- Folder delete must be soft delete by default.
- Deleted files and folders must appear in recycle bin.
- Users can restore items if they have permission.
- Admins can view deleted items within their scope.
- Permanent delete should be restricted to admins.
- Permanent delete must require confirmation.
- Permanent delete must be logged.

### Retention

Default recycle bin retention:

- 30 days.

Admin-configurable future option:

- 7, 30, 60, 90, or custom days.

---

## 7.16 Audit Logs

### Requirements

The system must log important actions.

Logged actions:

- Login success.
- Login failure.
- Logout.
- File upload.
- File download.
- File preview.
- File rename.
- File move.
- File delete.
- File restore.
- File permanent delete.
- File version added.
- File version restored.
- Folder create.
- Folder rename.
- Folder move.
- Folder delete.
- Permission change.
- User create.
- User update.
- User deactivate.
- Role change.
- Group change.
- Tag change.
- Classification change.
- Backup event.
- Antivirus detection.

### Audit Log Fields

- Audit ID.
- Actor user ID.
- Actor name.
- Action.
- Entity type.
- Entity ID.
- Entity name.
- Old value.
- New value.
- IP address.
- User agent.
- Timestamp.
- Success or failure.
- Failure reason.

### Audit Rules

- Audit logs must be append-only.
- Normal users cannot edit audit logs.
- Admins cannot delete audit logs from UI.
- Audit logs should be exportable by authorized auditors.

---

## 7.17 Notifications

### Version 1 Requirements

- Notify user when upload fails.
- Notify user when virus is detected.
- Notify user when file processing fails.
- Notify admin when storage is low.
- Notify admin when backup fails.

### Future Requirements

- Email notification.
- Microsoft Teams notification.
- Slack notification.
- Notification when shared file is updated.
- Notification for approval workflow.
- Notification for document expiry.

---

## 7.18 SMTP Email System

The system must include SMTP configuration so the application can send transactional and operational emails.

### SMTP Purpose

SMTP will be used for:

- User invitation emails.
- Password reset emails.
- Password changed emails.
- Account deactivation emails.
- Suspicious login alerts.
- Upload failed alerts.
- Malware detected alerts.
- File processing failed alerts.
- Permission change alerts where required.
- Backup success or failure alerts.
- Storage threshold alerts.
- Approval workflow notifications in future versions.
- Document expiry reminders in future versions.

### SMTP Configuration Fields

Admin or environment configuration must support:

- SMTP host.
- SMTP port.
- SMTP username.
- SMTP password or app password.
- SMTP encryption type.
- Sender email.
- Sender name.
- Reply-to email.
- Test recipient email.

SMTP encryption types:

- none.
- STARTTLS.
- SSL/TLS.

### SMTP Admin Requirements

Authorized admins must be able to:

- View SMTP configuration status without seeing the password.
- Update SMTP host.
- Update SMTP port.
- Update SMTP username.
- Update SMTP password.
- Update sender name.
- Update sender email.
- Send a test email.
- View last test result.
- View recent email delivery failures.

### Email Queue Requirements

- Emails must be queued through Redis/BullMQ.
- API requests must not wait for SMTP delivery except for explicit test email.
- Failed emails must retry automatically.
- Email failures must be logged.
- Critical email failure must notify admin in the dashboard.

### Email Template Requirements

Email templates must be professional and enterprise-friendly.

Required templates:

- User invitation.
- Password reset.
- Password changed.
- Account deactivated.
- File upload failed.
- Malware detected.
- Backup failed.
- Storage limit warning.
- Permission changed.

Each email should include:

- Company name.
- Application name.
- Clear subject.
- Short message.
- Relevant action link if applicable.
- Timestamp.
- Security note where applicable.

### SMTP Security Rules

- SMTP password must never be shown in UI.
- SMTP password must not be logged.
- SMTP secrets must be stored securely.
- Email links must use HTTPS URLs.
- Password reset links must expire.
- Password reset links must be single-use.
- Sensitive file names should not be included in email unless client approves.

---

## 7.19 Admin Dashboard

### Requirements

Dashboard should show:

- Total users.
- Active users.
- Suspended users.
- Total files.
- Total folders.
- Total storage used.
- Storage used by department.
- Recent uploads.
- Recent downloads.
- Recent deletes.
- Failed uploads.
- Virus detections.
- Backup status.
- Search index status.
- Worker status.
- Disk usage.

---

## 7.20 Ease Of Use And Productivity

The repository must be easy for daily business users. Enterprise-grade does not mean complicated. The product should reduce clicks, make common actions obvious, and help users find files quickly.

### User Productivity Features

The system should include:

- Recent files.
- Recently viewed folders.
- Favorite files.
- Favorite folders.
- Pinned department folders.
- Quick access to assigned project folders.
- Global search available from the top header.
- Saved filters for frequent searches.
- Bulk file upload.
- Bulk download as ZIP where allowed.
- Bulk move.
- Bulk delete where allowed.
- Bulk tag assignment where allowed.
- Drag-and-drop upload.
- Upload progress panel.
- Upload retry for failed uploads.
- Clear scan status after upload.
- Clear preview generation status.
- File details side panel.
- One-click copy internal file link.
- Breadcrumb navigation.
- Back to previous folder behavior.
- Sort by name, date, size, type, owner, and classification.
- Filter by department, project, tag, type, classification, date, uploader, and status.

### User-Friendly File Handling

The system should handle:

- Duplicate filename warning in same folder.
- Replace existing file as new version.
- Keep both files with renamed copy.
- Cancel upload.
- Retry failed upload.
- Resume upload in future version.
- Friendly error message when file type is blocked.
- Friendly error message when file size is too large.
- Friendly error message when user lacks permission.
- Friendly error message when file is still scanning.

### Recommended Daily User Dashboard

Normal users should see:

- My recent files.
- My favorite folders.
- Files shared with me internally.
- Pending approvals assigned to me if workflow is enabled.
- Recent project folders.
- Storage or quota warning if applicable.
- Important system notices.

### Recommended Admin Dashboard

Admins should see:

- Storage usage trend.
- Top departments by storage.
- Recent failed uploads.
- Recent malware detections.
- Pending access requests.
- Users not logged in recently.
- Backup status.
- Queue health.
- Search index health.
- SMTP health.

---

## 7.21 Access Request Workflow

Users may need access to folders or files they cannot currently open. The system should support an internal access request workflow.

### Version 1 Optional Requirement

If implemented in Version 1:

- User clicks request access.
- User provides reason.
- Request goes to folder owner, department admin, or project manager.
- Approver can approve or reject.
- Approval grants selected permission.
- Rejection records reason.
- Request activity is logged.
- User receives notification by in-app notification and email.

### Access Request Fields

- Request ID.
- Requesting user.
- Resource type.
- Resource ID.
- Requested permissions.
- Reason.
- Status.
- Approver.
- Decision reason.
- Created date.
- Decided date.

---

## 7.22 Reports

The system must include operational reports suitable for an ERP-style internal platform.

### Version 1 Reports

- User list report.
- Department storage report.
- File inventory report.
- Upload activity report.
- Download activity report.
- Delete and restore report.
- Permission assignment report.
- Audit log report.
- Malware detection report.
- Backup status report.

### Enterprise Reports For Later Versions

- Stale files report.
- Files without owner report.
- Confidential file access report.
- Restricted file download report.
- Access review report.
- User offboarding impact report.
- Storage growth forecast.
- Top file types by storage.
- External sharing report if external sharing is enabled.

### Export Requirements

Reports should be exportable as:

- CSV.
- XLSX in future version.
- PDF in future version.

Exports must respect RBAC.

---

## 7.23 User Offboarding

The system must support safe employee offboarding.

### Requirements

- Admin can deactivate user.
- Deactivated user cannot log in.
- Active sessions are revoked.
- Files owned by the user remain available to authorized users.
- Admin can transfer ownership of files and folders.
- Admin can view files owned by the user.
- Admin can view recent activity by the user.
- User deactivation must be logged.

### Future Requirements

- Automatic offboarding through SSO or SCIM.
- Offboarding checklist.
- Manager approval before ownership transfer.

---

## 8. Non-Functional Requirements

## 8.1 Security

### Requirements

- HTTPS required.
- Passwords must never be stored in plain text.
- Authentication tokens must be secure.
- Cookies must use secure flags.
- Role-based access control required.
- File access must always check permissions.
- Direct public access to stored files is forbidden.
- Uploads must be scanned for malware.
- Rate limiting required.
- Input validation required.
- Output encoding required.
- SQL injection protection required.
- Cross-site scripting protection required.
- Cross-site request forgery protection required where applicable.
- Secure headers required.
- Secrets must be stored in environment variables or a secrets manager.
- Admin actions must be audited.

### Recommended Security Headers

- Strict-Transport-Security.
- X-Content-Type-Options.
- X-Frame-Options or Content-Security-Policy frame rules.
- Content-Security-Policy.
- Referrer-Policy.
- Permissions-Policy.

---

## 8.2 Performance

### Requirements

- Folder listing should load within 2 seconds for normal folders.
- Search should return results within 2 seconds for normal queries.
- Large downloads must stream.
- File upload must show progress.
- Background jobs must not block normal browsing.
- Pagination required for large lists.
- Audit logs must be paginated.
- Search results must be paginated.

### Initial Expected Scale

- 100 to 300 employees.
- Thousands to hundreds of thousands of files.
- Multiple countries.
- Concurrent users may range from 10 to 50 initially.

---

## 8.3 Availability

### Requirements

- System should be available during business hours across regions.
- Planned maintenance should be communicated.
- Server monitoring required.
- Restart policy required for services.
- Backups required.

### Initial Target

- 99% monthly availability for Version 1 on VPS.

Higher availability will require multi-server or managed cloud architecture.

---

## 8.4 Scalability

### Requirements

- Storage layer must be replaceable.
- Search engine must be replaceable.
- Workers must be horizontally scalable later.
- Database schema must support large metadata volume.
- File IDs must not depend on filesystem paths.

---

## 8.5 Backup And Disaster Recovery

### Requirements

- Daily database backup.
- Daily file storage backup.
- Backup must be stored offsite.
- Backup must be encrypted.
- Backup restore must be tested regularly.
- Backup failure must alert admin.

### Recommended Tools On VPS

- Restic or BorgBackup for encrypted file backups.
- PostgreSQL dump or physical backup.
- Rclone for offsite copy.

### Backup Destinations

- Another VPS.
- Cloudflare R2.
- AWS S3.
- Backblaze B2.
- Wasabi.

### Recovery Targets

Initial target:

- RPO: 24 hours.
- RTO: 8 to 24 hours.

Definitions:

- RPO means maximum acceptable data loss window.
- RTO means maximum acceptable recovery time.

---

## 8.6 Compliance And Governance

### Requirements

- Audit trails.
- User access control.
- Data classification.
- Backup retention.
- Deletion tracking.
- Permission change tracking.
- Exportable reports.

### Future Governance Features

- Retention policies.
- Legal hold.
- Approval workflows.
- Watermarking.
- Access review.
- Data residency controls.

---

## 8.7 Enterprise Security Hardening

The system must be designed using secure-by-default practices.

### Application Security Requirements

- Follow OWASP secure coding practices.
- Validate all input on backend.
- Sanitize displayed user-controlled text.
- Use parameterized database queries through ORM or query builder.
- Enforce authorization on every backend endpoint.
- Do not rely on frontend checks for security.
- Use secure cookies if cookie-based auth is used.
- Use CSRF protection if cookie-based auth is used.
- Use strict CORS allowlist.
- Use request size limits.
- Use rate limiting on login, upload, download, and search endpoints.
- Use account lockout or throttling after repeated failed login attempts.
- Use secure password reset tokens.
- Use single-use reset tokens.
- Expire password reset tokens.
- Do not expose stack traces in production.
- Do not log passwords, tokens, SMTP secrets, or file contents.

### File Security Requirements

- Block dangerous file types by default.
- Detect MIME type on backend.
- Do not trust client-provided MIME type.
- Store files with generated storage keys.
- Prevent path traversal.
- Stream downloads through authorization layer.
- Do not expose local storage directory through Nginx.
- Scan files before making them available.
- Keep infected files inaccessible.
- Log malware detection.

### Encryption Requirements

- Use HTTPS for all traffic.
- Store password hashes using Argon2 or bcrypt.
- Encrypt backups.
- Protect SMTP credentials.
- Protect JWT/session secrets.
- Consider file-level encryption in a future enterprise stage.

### Session Security Requirements

- Access tokens should have short lifetime.
- Refresh tokens should be revocable.
- Logout must invalidate refresh token.
- Password change must invalidate other sessions.
- User deactivation must invalidate sessions.
- Admin should be able to revoke user sessions.

---

## 8.8 Observability And Monitoring

Enterprise systems must be observable. The team should know when something is slow, broken, full, unhealthy, or unsafe.

### Required Monitoring

Monitor:

- VPS CPU usage.
- VPS memory usage.
- Disk usage.
- Disk inode usage.
- Network traffic.
- PostgreSQL availability.
- PostgreSQL disk usage.
- Redis availability.
- Redis memory usage.
- Backend health endpoint.
- Frontend availability.
- Worker health.
- Queue depth.
- Failed jobs.
- Meilisearch health.
- ClamAV health.
- SMTP test status.
- Backup success or failure.
- SSL certificate expiry.

### Recommended Tools

- Uptime Kuma for uptime checks.
- Sentry for application errors.
- Docker logs with rotation.
- Prometheus and Grafana in a later version if needed.
- VPS provider alerts where available.

### Health Endpoints

Backend should expose:

- GET `/health`
- GET `/health/database`
- GET `/health/redis`
- GET `/health/search`
- GET `/health/storage`
- GET `/health/clamav`
- GET `/health/smtp`

Health endpoints must not leak secrets.

### Alert Channels

Alerts should be sent through:

- Email through SMTP.
- Admin dashboard.
- Optional Microsoft Teams or Slack webhook in future.

---

## 8.9 Hostinger VPS Production Constraints

The first deployment will run on Hostinger VPS, so the architecture must be practical and honest about limitations.

### What Hostinger VPS Can Support

Hostinger VPS can support:

- Enterprise MVP.
- 100 to 300 users if usage is moderate.
- Controlled internal access.
- Local file storage for early phase.
- Docker Compose deployment.
- Daily backup workflow.
- Single-node monitoring.

### What Hostinger VPS Does Not Automatically Provide

Hostinger VPS does not automatically provide:

- High availability.
- Multi-region performance.
- Automatic object storage durability.
- Managed database failover.
- Enterprise identity management.
- Built-in disaster recovery.
- Built-in malware scanning.
- Built-in SIEM logging.

### Required VPS Safeguards

Must implement:

- Offsite encrypted backups.
- Backup restore test.
- Firewall.
- SSH key authentication.
- Disabled password SSH login.
- Nginx HTTPS.
- Docker restart policies.
- Log rotation.
- Disk usage alerts.
- Separate storage directory outside app source.
- Storage abstraction for future object storage.

---

## 8.10 Future High-Availability Architecture

If the client later requires stronger uptime, the system should move beyond a single VPS.

Future architecture may include:

- Managed PostgreSQL.
- Object storage.
- Load balancer.
- Multiple backend instances.
- Multiple worker instances.
- Managed Redis.
- CDN for previews and downloads where allowed.
- Centralized logging.
- Automated deployment pipeline.
- Staging environment.
- Blue-green or rolling deployments.

This should be treated as a future enterprise infrastructure phase, not a Version 1 requirement unless the client demands strict SLA.

---

## 8.11 Data Migration

If the company already has files in shared drives, local PCs, Google Drive, SharePoint, Dropbox, or email attachments, migration must be planned.

### Migration Requirements

- Inventory existing files.
- Identify source locations.
- Map old folder structure to new folder structure.
- Decide department ownership.
- Decide project ownership.
- Decide classification defaults.
- Remove duplicates where appropriate.
- Preserve original filenames.
- Preserve modified dates where feasible.
- Import metadata where available.
- Scan imported files.
- Create audit entry for migration import.

### Migration Risks

- Duplicate files.
- Broken folder ownership.
- Sensitive files imported into wrong department.
- Huge storage usage.
- Corrupt files.
- Unsupported file types.
- Missing metadata.

### Migration Recommendation

Perform migration in batches:

- Pilot department.
- Review.
- Correct folder and permission model.
- Migrate remaining departments.

---

## 8.12 Accessibility And Usability

The application should be usable by employees with different technical skill levels and accessibility needs.

### Accessibility Requirements

- Use readable font sizes.
- Maintain sufficient color contrast.
- Do not rely only on color for status.
- Provide keyboard-accessible controls.
- Use semantic HTML.
- Use labels for form fields.
- Support screen-reader friendly names for important actions.
- Make error messages clear.

### Usability Requirements

- Common actions must be reachable in one or two clicks from file list.
- Users should not need to understand technical storage terms.
- Permission errors should explain who to contact or how to request access.
- Admin screens should have filters and search.
- Long tables must use pagination.
- Dangerous actions must require confirmation.
- Bulk actions must show clear selected item count.
- System should remember table preferences where useful.

---

## 8.13 External Technical References

The engineering team should use these references during implementation and security review:

- OWASP Application Security Verification Standard for web application security verification: https://owasp.org/www-project-application-security-verification-standard/
- NIST Digital Identity Guidelines for authentication and identity assurance concepts: https://pages.nist.gov/800-63-3/
- NIST SP 800-63B for authenticator guidance: https://csrc.nist.gov/pubs/sp/800/63/b/4/final
- PostgreSQL Backup and Restore documentation: https://www.postgresql.org/docs/current/backup.html
- PostgreSQL pg_restore documentation: https://www.postgresql.org/docs/current/app-pgrestore.html
- Meilisearch production deployment documentation: https://www.meilisearch.com/docs/resources/self_hosting/deployment/running_production

---

## 9. Recommended Technology Stack

## 9.1 Frontend

Recommended:

- Next.js.
- React.
- TypeScript.
- Tailwind CSS.
- shadcn/ui or equivalent component library.
- TanStack Query for API state.
- Zustand or Redux Toolkit only if needed.

Frontend responsibilities:

- Login UI.
- File manager UI.
- Folder tree.
- Breadcrumb navigation.
- Search UI.
- Upload progress UI.
- Preview UI.
- File details panel.
- Version history UI.
- Permission management UI.
- Admin dashboard.
- User management screens.

---

## 9.2 Backend

Recommended:

- NestJS.
- Node.js.
- TypeScript.
- REST API initially.
- OpenAPI/Swagger documentation.

Backend responsibilities:

- Authentication.
- Authorization.
- Metadata management.
- File upload handling.
- File download authorization.
- Audit logging.
- Permission evaluation.
- Search indexing coordination.
- Background job scheduling.
- Admin APIs.

Alternative:

- Java Spring Boot if client has Java enterprise preference.

---

## 9.3 Database

Recommended:

- PostgreSQL.

ORM recommendation:

- Prisma or TypeORM.

PostgreSQL stores:

- Users.
- Roles.
- Groups.
- Departments.
- Folders.
- Files.
- File versions.
- Permissions.
- Tags.
- Audit logs.
- Notifications.
- Background job references.

PostgreSQL must not store actual file binary content.

---

## 9.4 Cache And Queue

Recommended:

- Redis.
- BullMQ.

Used for:

- Background jobs.
- Upload processing.
- Antivirus scanning queue.
- Preview generation queue.
- Search indexing queue.
- Notification queue.
- Rate limiting support.

---

## 9.5 Search

Recommended for VPS Version 1:

- Meilisearch.

Reason:

- Easier to run on VPS.
- Lower memory requirements than OpenSearch.
- Good user-facing search experience.

Future:

- OpenSearch if full enterprise search and analytics become necessary.

---

## 9.6 Antivirus

Recommended:

- ClamAV.

Usage:

- Uploaded files go to quarantine.
- Worker sends file to ClamAV scan.
- Clean files move to permanent storage.
- Infected files remain blocked.
- Virus detection is logged.
- Admin is notified.

---

## 9.7 Reverse Proxy

Recommended:

- Nginx.

Responsibilities:

- HTTPS termination.
- Reverse proxy to frontend.
- Reverse proxy to backend.
- Upload body size limits.
- Basic rate limiting.
- Security headers.

---

## 9.8 Deployment

Recommended:

- Docker Compose on Hostinger VPS.

Services:

```text
nginx
frontend
backend
worker
postgres
redis
meilisearch
clamav
backup
uptime-kuma
```

---

## 9.9 API Standards

The backend API must follow consistent enterprise API conventions.

### API Requirements

- All APIs must be versioned.
- Recommended prefix: `/api/v1`.
- Use JSON for request and response bodies except file upload/download.
- Use consistent error format.
- Use pagination for list endpoints.
- Use filtering for operational tables.
- Use sorting for operational tables.
- Use OpenAPI/Swagger documentation.
- Use request IDs for tracing.
- Return proper HTTP status codes.

### Standard Error Format

Recommended format:

```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You do not have permission to download this file.",
    "requestId": "req_123",
    "details": {}
  }
}
```

### Pagination Format

Recommended format:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "totalItems": 250,
    "totalPages": 5
  }
}
```

### API Security Requirements

- Every protected route must require authentication.
- Every protected route must check authorization.
- File IDs must be opaque.
- Internal storage paths must never be returned to frontend.
- Admin-only APIs must be separately guarded.
- Audit-sensitive APIs must write audit logs.

---

## 9.10 Database Engineering Requirements

PostgreSQL must be designed for enterprise metadata volume.

### Indexing Requirements

Indexes should exist for:

- User email.
- User status.
- Folder parent ID.
- Folder department ID.
- File folder ID.
- File department ID.
- File project ID.
- File created date.
- File updated date.
- File deleted status.
- File classification.
- File owner.
- File version file ID.
- Audit actor user ID.
- Audit action.
- Audit entity type and ID.
- Audit created date.
- Access control subject type and ID.
- Access control resource type and ID.

### Database Rules

- Use migrations for schema changes.
- Do not manually edit production schema.
- Use foreign keys where practical.
- Use soft delete for business records where required.
- Use transactions for multi-step operations.
- Use database constraints for uniqueness.
- Keep audit logs append-only.
- Back up database separately from uploaded files.

---

## 9.11 CI/CD And Environments

The project should use separate environments.

### Required Environments

- Local development.
- Staging.
- Production.

### CI Requirements

On each merge request or main branch update:

- Install dependencies.
- Run linting.
- Run type checks.
- Run unit tests.
- Run backend integration tests where possible.
- Build frontend.
- Build backend.
- Build Docker images.

### Deployment Requirements

- Deploy to staging first.
- Run smoke tests.
- Take database backup before production deployment where schema changes exist.
- Deploy production.
- Verify health checks.
- Verify login.
- Verify upload.
- Verify download.

---

## 9.12 Documentation Requirements

The project must include:

- BRD.
- Architecture document.
- API documentation.
- Database schema documentation.
- Deployment guide.
- Backup and restore guide.
- Admin user guide.
- Employee user guide.
- Troubleshooting guide.
- Release notes.

---

## 10. High-Level Architecture

```text
User Browser
  |
  | HTTPS
  v
Nginx Reverse Proxy
  |
  +--> Next.js Frontend
  |
  +--> NestJS Backend API
          |
          +--> PostgreSQL Metadata DB
          |
          +--> Redis Queue
          |
          +--> Local Storage Adapter
          |
          +--> Meilisearch
          |
          +--> ClamAV
          |
          +--> Background Worker
```

---

## 11. Storage Flow

### Upload Flow

```text
User selects file
  |
Frontend sends upload request
  |
Backend validates permission and metadata
  |
File saved to quarantine
  |
Metadata record created with scan status = pending
  |
Antivirus scan job created
  |
Worker scans file using ClamAV
  |
If clean:
  - Move file to permanent storage
  - Create file version
  - Update status to clean
  - Index metadata
  - Generate preview
If infected:
  - Keep blocked or delete according to policy
  - Update status to infected
  - Notify admin
  - Write audit log
```

### Download Flow

```text
User clicks download
  |
Frontend requests download
  |
Backend checks authentication
  |
Backend checks file permission
  |
Backend checks file scan status
  |
Backend writes audit log
  |
Backend streams file
```

---

## 12. Suggested Database Entities

### 12.1 users

Fields:

- id.
- email.
- password_hash.
- full_name.
- employee_code.
- department_id.
- country.
- timezone.
- status.
- created_at.
- updated_at.
- last_login_at.

### 12.2 roles

Fields:

- id.
- name.
- description.
- is_system_role.
- created_at.

### 12.3 permissions

Fields:

- id.
- key.
- description.

Example permission keys:

- file.view.
- file.preview.
- file.download.
- file.upload.
- file.rename.
- file.move.
- file.delete.
- file.restore.
- file.version.create.
- file.version.restore.
- folder.create.
- folder.rename.
- folder.move.
- folder.delete.
- permission.manage.
- audit.view.

### 12.3.1 user_roles

Fields:

- id.
- user_id.
- role_id.
- assigned_by.
- assigned_at.

### 12.3.2 role_permissions

Fields:

- id.
- role_id.
- permission_key.
- assigned_by.
- assigned_at.

### 12.4 groups

Fields:

- id.
- name.
- description.
- department_id.
- created_at.

### 12.5 group_members

Fields:

- id.
- group_id.
- user_id.
- created_at.

### 12.6 departments

Fields:

- id.
- name.
- code.
- description.
- storage_quota_bytes.
- status.
- created_at.

### 12.7 folders

Fields:

- id.
- parent_id.
- name.
- path_cache.
- owner_user_id.
- owner_group_id.
- department_id.
- project_id.
- created_by.
- updated_by.
- deleted_by.
- created_at.
- updated_at.
- deleted_at.
- is_deleted.

### 12.8 files

Fields:

- id.
- folder_id.
- current_version_id.
- original_name.
- extension.
- mime_type.
- classification.
- owner_user_id.
- owner_group_id.
- department_id.
- project_id.
- description.
- created_by.
- updated_by.
- deleted_by.
- created_at.
- updated_at.
- deleted_at.
- is_deleted.

### 12.9 file_versions

Fields:

- id.
- file_id.
- version_number.
- storage_key.
- size_bytes.
- checksum_sha256.
- mime_type.
- scan_status.
- preview_status.
- uploaded_by.
- uploaded_at.

### 12.10 tags

Fields:

- id.
- name.
- color.
- scope.
- department_id.
- created_by.
- created_at.

### 12.11 file_tags

Fields:

- id.
- file_id.
- tag_id.
- created_at.

### 12.12 access_control_entries

Fields:

- id.
- subject_type.
- subject_id.
- resource_type.
- resource_id.
- permission_key.
- created_by.
- created_at.

Subject types:

- user.
- group.
- role.

Resource types:

- global.
- department.
- project.
- folder.
- file.

### 12.13 audit_logs

Fields:

- id.
- actor_user_id.
- action.
- entity_type.
- entity_id.
- entity_name.
- old_value_json.
- new_value_json.
- ip_address.
- user_agent.
- success.
- failure_reason.
- created_at.

### 12.14 notifications

Fields:

- id.
- user_id.
- type.
- title.
- message.
- is_read.
- created_at.

### 12.15 smtp_settings

Fields:

- id.
- host.
- port.
- username.
- encrypted_password.
- encryption.
- from_email.
- from_name.
- reply_to.
- is_enabled.
- last_test_status.
- last_test_at.
- updated_by.
- updated_at.

### 12.16 email_templates

Fields:

- id.
- template_key.
- subject.
- html_body.
- text_body.
- is_enabled.
- updated_by.
- updated_at.

### 12.17 email_delivery_logs

Fields:

- id.
- template_key.
- recipient_email.
- subject.
- status.
- failure_reason.
- retry_count.
- sent_at.
- created_at.

### 12.18 projects

Fields:

- id.
- name.
- code.
- description.
- department_id.
- owner_user_id.
- status.
- created_at.
- updated_at.

### 12.19 user_sessions

Fields:

- id.
- user_id.
- refresh_token_hash.
- ip_address.
- user_agent.
- expires_at.
- revoked_at.
- created_at.

### 12.20 password_reset_tokens

Fields:

- id.
- user_id.
- token_hash.
- expires_at.
- used_at.
- created_at.

### 12.21 access_requests

Fields:

- id.
- requester_user_id.
- resource_type.
- resource_id.
- requested_permissions_json.
- reason.
- status.
- approver_user_id.
- decision_reason.
- decided_at.
- created_at.

### 12.22 report_exports

Fields:

- id.
- requested_by.
- report_type.
- export_format.
- status.
- storage_key.
- failure_reason.
- created_at.
- completed_at.

### 12.23 background_jobs

Fields:

- id.
- job_type.
- entity_type.
- entity_id.
- status.
- attempts.
- last_error.
- created_at.
- started_at.
- completed_at.

### 12.24 storage_quota_events

Fields:

- id.
- scope_type.
- scope_id.
- quota_bytes.
- used_bytes.
- threshold_percent.
- event_type.
- created_at.

---

## 13. API Modules

### Authentication APIs

- POST `/auth/login`
- POST `/auth/logout`
- POST `/auth/refresh`
- POST `/auth/forgot-password`
- POST `/auth/reset-password`

### User APIs

- GET `/users`
- POST `/users`
- GET `/users/:id`
- PATCH `/users/:id`
- POST `/users/:id/deactivate`
- POST `/users/:id/reset-password`

### Role And RBAC APIs

- GET `/roles`
- POST `/roles`
- GET `/roles/:id`
- PATCH `/roles/:id`
- POST `/roles/:id/deactivate`
- GET `/permissions`
- GET `/roles/:id/permissions`
- POST `/roles/:id/permissions`
- DELETE `/roles/:id/permissions/:permissionKey`
- GET `/users/:id/effective-permissions`
- GET `/resources/:resourceType/:resourceId/access`
- POST `/resources/:resourceType/:resourceId/access`
- DELETE `/resources/:resourceType/:resourceId/access/:accessControlEntryId`

### Group APIs

- GET `/groups`
- POST `/groups`
- GET `/groups/:id`
- PATCH `/groups/:id`
- DELETE `/groups/:id`
- POST `/groups/:id/members`
- DELETE `/groups/:id/members/:userId`

### Folder APIs

- GET `/folders/:id`
- POST `/folders`
- PATCH `/folders/:id`
- POST `/folders/:id/move`
- DELETE `/folders/:id`
- POST `/folders/:id/restore`

### File APIs

- POST `/files/upload`
- GET `/files/:id`
- PATCH `/files/:id`
- GET `/files/:id/download`
- GET `/files/:id/preview`
- DELETE `/files/:id`
- POST `/files/:id/restore`
- POST `/files/:id/versions`
- GET `/files/:id/versions`
- POST `/files/:id/versions/:versionId/restore`

### Search APIs

- GET `/search`
- GET `/search/suggestions`

### Permission APIs

- GET `/permissions/resource`
- POST `/permissions/resource`
- DELETE `/permissions/:id`

### Audit APIs

- GET `/audit-logs`
- GET `/audit-logs/export`

### Admin APIs

- GET `/admin/dashboard`
- GET `/admin/storage`
- GET `/admin/system-health`

### SMTP APIs

- GET `/settings/smtp`
- PATCH `/settings/smtp`
- POST `/settings/smtp/test`
- GET `/settings/smtp/delivery-logs`

### Access Request APIs

- GET `/access-requests`
- POST `/access-requests`
- GET `/access-requests/:id`
- POST `/access-requests/:id/approve`
- POST `/access-requests/:id/reject`

### Report APIs

- GET `/reports/storage`
- GET `/reports/file-inventory`
- GET `/reports/activity`
- GET `/reports/permissions`
- POST `/reports/:reportType/export`
- GET `/reports/exports/:id`

### Health APIs

- GET `/health`
- GET `/health/database`
- GET `/health/redis`
- GET `/health/search`
- GET `/health/storage`
- GET `/health/clamav`
- GET `/health/smtp`

---

## 13.1 API cURL Examples

These cURL examples define expected API behavior for developers and QA. Exact fields may be adjusted during implementation, but the final API must preserve the same business capability.

### Login

```bash
curl -X POST "https://repo.company.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "StrongPassword123!"
  }'
```

Expected result:

```json
{
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "user": {
    "id": "user_123",
    "email": "admin@company.com",
    "fullName": "System Admin"
  }
}
```

### Create Role

```bash
curl -X POST "https://repo.company.com/api/roles" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Department Document Controller",
    "code": "DEPARTMENT_DOCUMENT_CONTROLLER",
    "description": "Can manage department repository documents"
  }'
```

### Assign Permission To Role

```bash
curl -X POST "https://repo.company.com/api/roles/role_123/permissions" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permissionKey": "file.download"
  }'
```

### Create Group

```bash
curl -X POST "https://repo.company.com/api/groups" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Finance India",
    "description": "Finance department users in India",
    "departmentId": "dept_finance"
  }'
```

### Add User To Group

```bash
curl -X POST "https://repo.company.com/api/groups/group_123/members" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_456"
  }'
```

### Assign Folder Permission To Group

```bash
curl -X POST "https://repo.company.com/api/resources/folder/folder_123/access" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subjectType": "group",
    "subjectId": "group_123",
    "permissions": [
      "folder.read",
      "file.read",
      "file.preview",
      "file.download",
      "file.create"
    ]
  }'
```

### View Effective Permissions For User

```bash
curl -X GET "https://repo.company.com/api/users/user_456/effective-permissions?resourceType=folder&resourceId=folder_123" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

Expected result:

```json
{
  "userId": "user_456",
  "resourceType": "folder",
  "resourceId": "folder_123",
  "permissions": [
    "folder.read",
    "file.read",
    "file.preview",
    "file.download",
    "file.create"
  ],
  "sources": [
    {
      "type": "group",
      "id": "group_123",
      "name": "Finance India"
    }
  ]
}
```

### Upload File

```bash
curl -X POST "https://repo.company.com/api/files/upload" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -F "folderId=folder_123" \
  -F "classification=Internal" \
  -F "tags=Invoice,Finance" \
  -F "file=@./invoice.pdf"
```

Expected result:

```json
{
  "fileId": "file_123",
  "versionId": "version_001",
  "status": "scanning",
  "message": "File uploaded and queued for antivirus scan"
}
```

### Download File

```bash
curl -X GET "https://repo.company.com/api/files/file_123/download" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -o "invoice.pdf"
```

### Update SMTP Settings

```bash
curl -X PATCH "https://repo.company.com/api/settings/smtp" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "host": "smtp.office365.com",
    "port": 587,
    "username": "noreply@company.com",
    "password": "SMTP_APP_PASSWORD",
    "encryption": "STARTTLS",
    "fromEmail": "noreply@company.com",
    "fromName": "Company File Repository",
    "replyTo": "it-support@company.com"
  }'
```

### Send SMTP Test Email

```bash
curl -X POST "https://repo.company.com/api/settings/smtp/test" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "it-support@company.com"
  }'
```

### Read Audit Logs

```bash
curl -X GET "https://repo.company.com/api/audit-logs?action=file.download&from=2026-06-01&to=2026-06-30&page=1&pageSize=50" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

### Create Access Request

```bash
curl -X POST "https://repo.company.com/api/access-requests" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "folder",
    "resourceId": "folder_123",
    "requestedPermissions": ["folder.read", "file.preview", "file.download"],
    "reason": "Required for monthly finance reconciliation"
  }'
```

### Approve Access Request

```bash
curl -X POST "https://repo.company.com/api/access-requests/request_123/approve" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "decisionReason": "Approved for finance month-end work"
  }'
```

### Export Storage Report

```bash
curl -X POST "https://repo.company.com/api/reports/storage/export" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "csv",
    "filters": {
      "departmentId": "dept_finance"
    }
  }'
```

### Health Check

```bash
curl -X GET "https://repo.company.com/api/health" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

---

## 14. User Interface Requirements

The application must look and behave like an enterprise ERP module. It should feel operational, structured, and business-grade. It should not look like a casual consumer file-sharing app.

### 14.0 ERP-Level Design Requirements

The UI must include:

- Persistent left sidebar navigation.
- Top header with company name, user profile, notifications, and quick search.
- Module-style navigation similar to ERP systems.
- Dashboard-first experience after login.
- Dense but readable data tables.
- Filters, sorting, pagination, and column visibility controls.
- Breadcrumbs for folder navigation.
- Master-data screens for users, roles, groups, departments, projects, tags, and classifications.
- Status badges for scan status, preview status, classification, and workflow status.
- Admin-level reporting screens.
- Audit-friendly detail pages.
- Confirmation dialogs for destructive actions.
- Empty states that are professional and concise.
- Loading states for slow file operations.
- Error states with clear next actions.
- Responsive layout for laptop and desktop first.
- Tablet support if required.

ERP-style modules:

- Dashboard.
- Repository.
- Departments.
- Projects.
- Users.
- Roles and Permissions.
- Groups.
- Audit Logs.
- Reports.
- Backup and Storage.
- System Settings.

Design principles:

- Prioritize clarity and speed over decorative layout.
- Avoid marketing-style landing pages inside the authenticated app.
- Avoid large hero sections.
- Avoid overly colorful consumer styling.
- Use neutral enterprise colors with clear status colors.
- Use compact spacing for tables and admin screens.
- Use icons for actions where familiar.
- Keep file actions consistent across list view, details panel, and context menu.
- Always show the user's current location in the repository.
- Never expose actions the user cannot perform, but still enforce permissions on the backend.

### 14.1 Main File Manager

Must include:

- Left folder tree.
- Top breadcrumb.
- Search bar.
- File/folder table.
- Upload button.
- New folder button.
- Filter controls.
- Sort controls.
- File action menu.
- Details side panel.

### 14.2 File Table Columns

- Name.
- Type.
- Size.
- Modified date.
- Modified by.
- Classification.
- Tags.
- Status.

### 14.3 File Actions

- Preview.
- Download.
- Rename.
- Move.
- Replace with new version.
- Version history.
- Details.
- Manage permissions.
- Delete.

### 14.4 Admin Screens

- Users.
- Groups.
- Roles.
- Departments.
- Permissions.
- Audit logs.
- Storage dashboard.
- System health.
- Backup status.
- Settings.

---

## 15. DevOps Requirements

### VPS Setup

Recommended minimum:

- 4 vCPU.
- 8 GB RAM.
- 200 GB storage minimum, depending on client data.
- Ubuntu LTS.
- Root SSH disabled after setup.
- SSH key authentication only.
- Firewall enabled.

Recommended better setup:

- 8 vCPU.
- 16 GB RAM.
- Separate mounted storage volume.
- Offsite backup destination.

### Open Ports

Only expose:

- 80 HTTP for certificate challenge and redirect.
- 443 HTTPS.
- SSH on restricted IP or non-default port if client policy allows.

### Required Services

- Docker.
- Docker Compose.
- Nginx.
- Certbot or automatic TLS container.
- PostgreSQL.
- Redis.
- Meilisearch.
- ClamAV.
- Application backend.
- Application frontend.
- Background worker.

---

## 16. Environment Variables

Example categories:

```text
APP_ENV
APP_URL
API_URL
DATABASE_URL
REDIS_URL
JWT_SECRET
JWT_REFRESH_SECRET
SESSION_SECRET
STORAGE_DRIVER
LOCAL_STORAGE_ROOT
MEILISEARCH_HOST
MEILISEARCH_API_KEY
CLAMAV_HOST
CLAMAV_PORT
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASSWORD
SMTP_SECURE
SMTP_FROM_EMAIL
SMTP_FROM_NAME
SMTP_REPLY_TO
SMTP_REQUIRE_TLS
BACKUP_DESTINATION
```

Rules:

- Never commit secrets to Git.
- Use separate values for development, staging, and production.
- Rotate secrets if exposed.

---

## 17. Testing Requirements

### Unit Tests

Must cover:

- Permission evaluation.
- File metadata validation.
- User role logic.
- Folder path logic.
- Storage adapter logic.
- Audit log creation.

### Integration Tests

Must cover:

- Login.
- Upload.
- Scan success.
- Scan failure.
- Download with permission.
- Download without permission.
- File delete and restore.
- Version creation.
- Search indexing.
- SMTP test email.
- Email queue retry.
- Access request approval.
- Report export.
- Health checks.

### Security Tests

Must cover:

- Unauthorized file access.
- Direct URL guessing.
- Permission bypass attempts.
- Invalid file types.
- Oversized uploads.
- Path traversal attempts.
- SQL injection attempts.
- XSS attempts in filenames and metadata.
- Unauthorized API access.
- Expired token behavior.
- Revoked session behavior.
- Password reset token reuse attempt.
- Direct storage path access attempt.
- Blocked file extension upload.
- MIME mismatch upload.

### Observability Tests

Must cover:

- Backend health endpoint.
- Database health endpoint.
- Redis health endpoint.
- Search health endpoint.
- Storage health endpoint.
- ClamAV health endpoint.
- SMTP health endpoint.
- Backup failure alert.
- Queue failure alert.

### Backup And Restore Tests

Must cover:

- Database backup creation.
- File storage backup creation.
- Backup encryption.
- Restore database into test environment.
- Restore sample files into test environment.
- Verify metadata and physical files match after restore.

### User Acceptance Testing

Business users must test:

- Department folder access.
- Project folder access.
- Upload and download.
- Search.
- Preview.
- Version history.
- Recycle bin.
- Admin user management.
- Audit log visibility.
- Recent files.
- Favorite folders.
- Bulk upload.
- Permission denied flow.
- Access request flow.
- Report export.
- Admin dashboard health indicators.

---

## 18. Acceptance Criteria For MVP

The MVP is acceptable when:

- The authenticated product looks and behaves like an enterprise ERP module.
- Left navigation, top header, dashboards, master-data screens, and operational tables are implemented.
- Daily user dashboard is implemented.
- Admin operational dashboard is implemented.
- Users can log in securely.
- Admin can create users, departments, groups, and roles.
- Admin can manage RBAC permissions.
- Admin can view effective permissions for users.
- Admin can assign folder permissions.
- Users can only see folders and files they are allowed to see.
- Users can upload allowed file types.
- Uploaded files are scanned before availability.
- Users can download only allowed files.
- File previews work for PDFs and images.
- Users can create and navigate folders.
- Users can search by file name, tags, uploader, type, and date.
- Users can replace a file and preserve old versions.
- Users can access recent files and favorite folders.
- Users receive clear error messages for permission, size, type, and scan-state issues.
- Deleted files go to recycle bin.
- Admin can restore deleted files.
- All important actions are recorded in audit logs.
- Reports exist for users, storage, file inventory, activity, permissions, audit logs, malware detections, and backup status.
- Access request workflow is implemented or explicitly deferred with client approval.
- Daily backup process exists.
- Backup restore test is completed in a test environment.
- SMTP settings can be configured.
- SMTP test email can be sent.
- Required system emails are queued and logged.
- Health endpoints exist for backend, database, Redis, search, storage, ClamAV, and SMTP.
- Monitoring alerts are configured for uptime, disk usage, queue failure, backup failure, and SSL expiry.
- Application runs on Hostinger VPS through HTTPS.
- Basic monitoring is configured.

---

## 19. Risks And Mitigations

### Risk: VPS Disk Failure

Mitigation:

- Offsite encrypted backups.
- Storage adapter for future object storage.
- Regular restore testing.

### Risk: Unauthorized File Access

Mitigation:

- Strict backend authorization.
- No direct public file paths.
- Audit logs.
- Permission tests.

### Risk: Malware Upload

Mitigation:

- Quarantine uploads.
- ClamAV scanning.
- Block infected files.
- Notify admin.

### Risk: Storage Growth

Mitigation:

- Storage quotas.
- Usage dashboard.
- Archive strategy.
- Future S3-compatible storage migration.

### Risk: Performance Issues

Mitigation:

- Pagination.
- Streaming downloads.
- Background jobs.
- Search indexing.
- Proper database indexes.

### Risk: Permission Complexity

Mitigation:

- Start with allow-based permissions.
- Use groups.
- Avoid explicit deny in Version 1.
- Add access review later.

### Risk: Single VPS Availability Limitation

Mitigation:

- Set honest availability expectations.
- Use monitoring and restart policies.
- Keep offsite backups.
- Test restore process.
- Plan future high-availability architecture if required.

### Risk: Enterprise UI Becomes Too Complex

Mitigation:

- Keep daily user actions simple.
- Separate admin screens from employee screens.
- Use dashboards for quick access.
- Use filters and saved views.
- Run UAT with real department users.

---

## 20. Development Phases

### Phase 0: Discovery And Confirmation

- Confirm departments.
- Confirm user roles.
- Confirm expected storage size.
- Confirm maximum file size.
- Confirm allowed file types.
- Confirm blocked file types.
- Confirm backup expectations.
- Confirm whether external sharing is required.
- Confirm whether SSO is required immediately.

### Phase 1: Foundation

- Project setup.
- Docker Compose.
- Database schema.
- Auth.
- Session management.
- Password reset flow.
- SMTP foundation.
- User management.
- Role and group management.
- RBAC permission engine.
- Folder model.
- Local storage adapter.

### Phase 2: Core File Repository

- Upload.
- Download.
- Folder browsing.
- File metadata.
- Soft delete.
- Recycle bin.
- File versioning.
- Audit logs.
- Recent files.
- Favorite folders.
- Bulk actions.
- User dashboard.

### Phase 3: Security And Processing

- Antivirus scanning.
- Quarantine flow.
- Permission enforcement.
- Preview generation.
- Search indexing.
- Rate limiting.
- Secure headers.
- Health endpoints.
- Session revocation.
- Security test coverage.

### Phase 4: Admin And Reporting

- Admin dashboard.
- Storage dashboard.
- Audit log search.
- Report module.
- Access request workflow if approved for MVP.
- SMTP configuration screen.
- User offboarding controls.
- Backup status.
- System health page.

### Phase 5: Production Deployment

- VPS hardening.
- HTTPS.
- Nginx.
- Docker Compose production setup.
- Backups.
- Monitoring.
- Restore test.
- SSL expiry monitoring.
- Disk usage alerts.
- Queue failure alerts.
- UAT.

### Phase 6: Enterprise Enhancements

- SSO.
- MFA.
- SCIM provisioning.
- Full-text search.
- OCR.
- Approval workflows.
- Expiring share links.
- Retention policies.
- Object storage migration.
- High-availability architecture.
- SIEM integration.

---

## 21. Important Client Questions

These questions must be answered before final design freeze:

1. Which departments will use the repository?
2. How many users are expected in year one?
3. How much existing data must be migrated?
4. What is the expected storage size in year one?
5. What is the expected storage size after three years?
6. What is the maximum single file size?
7. Which file types must be supported?
8. Which file types must be blocked?
9. Should users outside the company ever access files?
10. Is SSO required from day one?
11. Does the company use Microsoft 365, Google Workspace, or another identity provider?
12. Are audit reports required by management or compliance?
13. Are there documents that must never be deleted?
14. What is the required backup retention period?
15. What is the required restore time after disaster?
16. Should downloads be allowed for confidential files?
17. Should confidential files have watermarks?
18. Should users be able to share files by link?
19. Should link sharing be internal only?
20. Should files require approval before becoming visible?
21. What uptime or SLA does the client expect?
22. Is a single VPS acceptable for the first release?
23. Should the system support access request approval in MVP?
24. Which reports are required for management from day one?
25. Are there existing files to migrate from shared drives, SharePoint, Google Drive, Dropbox, or local machines?
26. Should ownership transfer be part of employee offboarding?
27. Does the company need country-wise data residency rules?
28. Who should receive backup failure and security alert emails?
29. What is the expected daily upload volume?
30. What is the expected number of concurrent users during peak hours?

---

## 22. Version 1 Recommendation

For this client and current Hostinger VPS constraint, build Version 1 with:

- Next.js frontend.
- NestJS backend.
- PostgreSQL database.
- Redis queue.
- BullMQ workers.
- Local VPS storage through storage adapter.
- Meilisearch.
- ClamAV.
- Nginx.
- Docker Compose.
- Daily encrypted offsite backups.
- Audit logs.
- Role and group permissions.
- Effective permission viewer.
- File versioning.
- Recycle bin.
- SMTP notifications.
- User dashboard.
- Admin operational dashboard.
- Report module.
- Health checks.
- Monitoring alerts.
- Admin dashboard.

The system should be designed so that the file storage can later move from local VPS disk to object storage without changing the user experience.

---

## 23. Definition Of Done

The system is considered production-ready when:

- All MVP acceptance criteria pass.
- Security review issues are resolved.
- Backup and restore are tested.
- Upload scanning is verified.
- Permission bypass tests fail safely.
- HTTPS is active.
- Admin documentation exists.
- User guide exists.
- Deployment documentation exists.
- Monitoring is active.
- Client UAT is signed off.

---

## 24. Source Of Truth Rule

This document is the source of truth for the initial build. Any feature, workflow, permission, or architecture change must be reflected in this document before implementation.

If product decisions change during development, update this BRD first, then update implementation tasks and tests.
