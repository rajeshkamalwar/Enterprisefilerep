export const permissions = [
  "user.create",
  "user.read",
  "user.update",
  "user.deactivate",
  "role.create",
  "role.read",
  "role.update",
  "role.deactivate",
  "role.permission.assign",
  "group.create",
  "group.read",
  "group.update",
  "group.deactivate",
  "group.member.add",
  "group.member.remove",
  "folder.create",
  "folder.read",
  "folder.update",
  "folder.move",
  "folder.delete",
  "folder.restore",
  "file.create",
  "file.read",
  "file.preview",
  "file.download",
  "file.update",
  "file.move",
  "file.delete",
  "file.restore",
  "file.version.create",
  "file.version.read",
  "file.version.restore",
  "permission.assign",
  "permission.remove",
  "audit.read",
  "audit.export",
  "settings.read",
  "settings.update",
  "smtp.read",
  "smtp.update",
  "backup.read",
  "backup.run"
];

export const roles = [
  {
    id: "role_super_admin",
    code: "SUPER_ADMIN",
    name: "Super Admin",
    description: "Full system access",
    permissions
  },
  {
    id: "role_department_admin",
    code: "DEPARTMENT_ADMIN",
    name: "Department Admin",
    description: "Manage department users, folders, files, and reports",
    permissions: [
      "user.read",
      "group.read",
      "folder.create",
      "folder.read",
      "folder.update",
      "file.create",
      "file.read",
      "file.preview",
      "file.download",
      "file.version.create",
      "permission.assign",
      "audit.read"
    ]
  },
  {
    id: "role_employee",
    code: "EMPLOYEE",
    name: "Employee",
    description: "Daily repository user",
    permissions: ["folder.read", "file.read", "file.preview", "file.download", "file.create"]
  }
];

