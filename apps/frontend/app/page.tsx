"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArchiveRestore,
  ArrowLeft,
  Bell,
  Building2,
  CheckCircle2,
  ChartNoAxesCombined,
  Database,
  Download,
  FileText,
  FolderPlus,
  FolderTree,
  Gauge,
  Heart,
  History,
  KeyRound,
  LockKeyhole,
  LogOut,
  Mail,
  Pencil,
  RefreshCcw,
  Search,
  ServerCog,
  Settings,
  ShieldCheck,
  Upload,
  Users,
  XCircle
} from "lucide-react";

const modules = [
  { id: "dashboard", name: "Dashboard", eyebrow: "Executive Cockpit", icon: Gauge },
  { id: "repository", name: "Repository", eyebrow: "Document Operations", icon: FolderTree },
  { id: "recycle", name: "Recycle Bin", eyebrow: "Recovery Console", icon: ArchiveRestore },
  { id: "access", name: "Access Requests", eyebrow: "Approval Workflow", icon: KeyRound },
  { id: "departments", name: "Departments", eyebrow: "Organization Master", icon: Building2 },
  { id: "users", name: "Users", eyebrow: "Identity Administration", icon: Users },
  { id: "roles", name: "Roles & RBAC", eyebrow: "Security Matrix", icon: LockKeyhole },
  { id: "audit", name: "Audit Logs", eyebrow: "Compliance Trail", icon: History },
  { id: "reports", name: "Reports", eyebrow: "Management Information", icon: ChartNoAxesCombined },
  { id: "smtp", name: "SMTP", eyebrow: "Notification Engine", icon: Mail },
  { id: "health", name: "System Health", eyebrow: "Operations Console", icon: ServerCog },
  { id: "settings", name: "Settings", eyebrow: "System Controls", icon: Settings }
] as const;

type ModuleId = (typeof modules)[number]["id"];

const moduleIds = new Set<string>(modules.map((module) => module.id));

function isModuleId(value: string | null): value is ModuleId {
  return Boolean(value && moduleIds.has(value));
}

const auditActions = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILURE",
  "LOGOUT",
  "DEPARTMENT_CREATED",
  "DEPARTMENT_UPDATED",
  "USER_CREATED",
  "USER_UPDATED",
  "ROLE_CREATED",
  "PERMISSION_ASSIGNED",
  "ACCESS_REQUEST_CREATED",
  "ACCESS_REQUEST_APPROVED",
  "ACCESS_REQUEST_REJECTED",
  "ACCESS_DENIED",
  "FOLDER_CREATED",
  "FOLDER_UPDATED",
  "FILE_UPLOADED",
  "FILE_DOWNLOADED",
  "FILE_DELETED",
  "FILE_SCAN_COMPLETED",
  "FILE_SCAN_FAILED"
];

type LoginResponse = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    roles: string[];
  };
};

type Dashboard = {
  totalUsers: number;
  activeUsers: number;
  totalFiles: number;
  storageUsedBytes: number;
  pendingAccessRequests: number;
  failedJobs: number;
  smtpStatus: string;
  recentActivity: Array<{
    id: string;
    action: string;
    actor: string;
    entityName: string | null;
    createdAt: string;
  }>;
};

type HealthResponse = {
  status: string;
  checks: Array<{
    name: string;
    status: string;
    detail: string;
  }>;
};

type FolderSummary = {
  id: string;
  parentId: string | null;
  name: string;
  pathCache: string | null;
  departmentId: string | null;
  department?: {
    id?: string;
    name: string;
    code: string;
  } | null;
  childFolderCount: number;
  fileCount: number;
};

type RepositoryFile = {
  id: string;
  originalName: string;
  classification: string;
  updatedAt: string;
  folder?: {
    name: string;
    pathCache: string | null;
  };
  createdBy?: {
    fullName: string;
    email: string;
  };
  department?: {
    name: string;
    code: string;
  } | null;
  currentVersion?: {
    id?: string;
    versionNumber?: number;
    sizeBytes: string;
    scanStatus: string;
    previewStatus?: string;
    uploadedAt: string;
  } | null;
  versions?: Array<{
    id: string;
    versionNumber: number;
    sizeBytes: string;
    checksumSha256: string;
    scanStatus: string;
    previewStatus: string;
    uploadedAt: string;
  }>;
};

type FolderDetail = {
  folder: {
    id: string;
    parentId: string | null;
    name: string;
    pathCache: string | null;
    departmentId: string | null;
  };
  breadcrumbs: Array<{ id: string; name: string }>;
  children: FolderSummary[];
  files: RepositoryFile[];
};

type AppData = {
  dashboard: Dashboard;
  health: HealthResponse;
  roots: FolderSummary[];
  folder: FolderDetail | null;
  files: RepositoryFile[];
  myAccessRequests: AccessRequest[];
  approvalRequests: AccessRequest[];
  managedUsers: ManagedUser[];
  userOptions: UserOptions;
  departments: ManagedDepartment[];
  auditLogs: AuditLog[];
  auditMeta: {
    page: number;
    pageSize: number;
    total: number;
    pageCount: number;
  };
  smtpSettings: SmtpSettings | null;
  smtpQueue: EmailQueueCounts | null;
  smtpDeliveryLogs: EmailDeliveryLog[];
  roles: RoleSummary[];
  permissions: PermissionSummary[];
  reportCards: ReportCard[];
  deletedFiles: RepositoryFile[];
  deletedFolders: FolderSummary[];
  systemSettings: SystemSettings | null;
  emailTemplates: EmailTemplate[];
};

type UploadResult = RepositoryFile & {
  scanQueued?: boolean;
  scanQueueError?: string;
};

type AccessRequest = {
  id: string;
  requester?: {
    fullName: string;
    email: string;
  } | null;
  resourceType: string;
  resourceId: string;
  permissionKey: string;
  businessJustification: string;
  status: string;
  decisionReason: string | null;
  decidedAt: string | null;
  createdAt: string;
};

type ManagedUser = {
  id: string;
  email: string;
  fullName: string;
  employeeCode: string | null;
  country: string | null;
  timezone: string;
  status: string;
  departmentId: string | null;
  department?: {
    id: string;
    name: string;
    code: string;
  } | null;
  roles: Array<{
    id: string;
    code: string;
    name: string;
  }>;
  lastLoginAt: string | null;
  createdAt: string;
};

type UserOptions = {
  departments: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  roles: Array<{
    id: string;
    code: string;
    name: string;
  }>;
};

type ManagedDepartment = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  storageQuotaBytes: string | null;
  storageUsedBytes: string;
  quotaUsedPercent: number | null;
  status: string;
  userCount: number;
  folderCount: number;
  fileCount: number;
  createdAt: string;
};

type AuditLog = {
  id: string;
  actorUserId: string | null;
  actor: {
    id: string;
    email: string;
    fullName: string;
  } | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  entityName: string | null;
  success: boolean;
  failureReason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

type AuditLogResponse = {
  data: AuditLog[];
  meta: AppData["auditMeta"];
};

type AuditFilters = {
  q: string;
  action: string;
  success: string;
};

type SmtpSettings = {
  configured: boolean;
  source: string;
  host: string | null;
  port: number;
  username: string | null;
  usernameConfigured: boolean;
  passwordConfigured: boolean;
  secure: boolean;
  requireTls: boolean;
  fromEmail: string | null;
  fromName: string;
  replyTo: string | null;
  lastTestStatus: string;
  lastTestedAt: string | null;
};

type EmailQueueCounts = {
  waiting?: number;
  active?: number;
  completed?: number;
  failed?: number;
  delayed?: number;
  paused?: number;
};

type EmailDeliveryLog = {
  id: string;
  templateKey: string;
  recipientEmail: string;
  subject: string;
  status: string;
  failureReason: string | null;
  retryCount: number;
  sentAt: string | null;
  createdAt: string;
};

type RoleSummary = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  permissions: Array<{
    permissionKey: string;
  }>;
};

type PermissionSummary = {
  key: string;
  description: string | null;
};

type ReportCard = {
  key: string;
  title: string;
  summary: string;
  count: number | null;
};

type SystemSettings = {
  storageDriver: string;
  localStorageRoot: string;
  maxUploadBytes: number;
  storageQuotaBytes: number;
  storageWarningThresholdPercent: number;
  backupDestination: string | null;
  appUrl: string;
  apiUrl: string;
};

type EmailTemplate = {
  id: string;
  templateKey: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  isEnabled: boolean;
  updatedAt: string;
  createdAt: string;
};

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

const emptyDashboard: Dashboard = {
  totalUsers: 0,
  activeUsers: 0,
  totalFiles: 0,
  storageUsedBytes: 0,
  pendingAccessRequests: 0,
  failedJobs: 0,
  smtpStatus: "restricted",
  recentActivity: []
};

const emptyUserOptions: UserOptions = {
  departments: [],
  roles: []
};

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let size = value / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

function bytesStringToGb(value: string | null) {
  if (!value) {
    return "";
  }

  return (Number(value) / 1024 / 1024 / 1024).toFixed(2).replace(/\.?0+$/, "");
}

function gbInputToBytes(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const gb = Number(trimmed);

  if (!Number.isFinite(gb) || gb < 0) {
    throw new Error("Storage quota must be a non-negative number.");
  }

  return Math.round(gb * 1024 * 1024 * 1024).toString();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function auditPath(filters: AuditFilters) {
  const params = new URLSearchParams({ pageSize: "20" });

  if (filters.q.trim()) {
    params.set("q", filters.q.trim());
  }

  if (filters.action) {
    params.set("action", filters.action);
  }

  if (filters.success === "true" || filters.success === "false") {
    params.set("success", filters.success);
  }

  return `/audit-logs?${params.toString()}`;
}

async function apiRequest<T>(path: string, token?: string, init: RequestInit = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers
    }
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text || `Request failed: ${response.status}`;

    try {
      const parsed = JSON.parse(text) as { message?: string; error?: string };
      message = parsed.message ?? parsed.error ?? message;
    } catch {
      // Keep the plain response text when the server does not return JSON.
    }

    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

async function loadReportCards(token: string): Promise<ReportCard[]> {
  const reportDefinitions = [
    { key: "storage", title: "Storage Report", path: "/reports/storage" },
    { key: "file-inventory", title: "File Inventory", path: "/reports/file-inventory" },
    { key: "users", title: "User Activity", path: "/reports/users" },
    { key: "activity", title: "Activity Report", path: "/reports/activity" },
    { key: "permissions", title: "Permissions Report", path: "/reports/permissions" },
    { key: "malware", title: "Malware Report", path: "/reports/malware" },
    { key: "backup", title: "Backup Report", path: "/reports/backup" }
  ];

  const results = await Promise.all(
    reportDefinitions.map(async (definition) => {
      const report = await apiRequest<Record<string, unknown>>(definition.path, token);
      const count = typeof report.rowCount === "number"
        ? report.rowCount
        : Array.isArray(report.data)
          ? report.data.length
          : null;

      return {
        key: definition.key,
        title: definition.title,
        summary: String(report.generatedAt ?? report.status ?? "Ready"),
        count
      };
    })
  );

  return results;
}

async function uploadRequest(path: string, token: string, body: FormData) {
  const response = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text || `Request failed: ${response.status}`;

    try {
      const parsed = JSON.parse(text) as { message?: string; error?: string };
      message = parsed.message ?? parsed.error ?? message;
    } catch {
      // Keep the plain response text when the server does not return JSON.
    }

    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<UploadResult>;
}

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<LoginResponse["user"] | null>(null);
  const [email, setEmail] = useState("admin@company.com");
  const [password, setPassword] = useState("");
  const [activeModule, setActiveModule] = useState<ModuleId>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchClassification, setSearchClassification] = useState("");
  const [searchScanStatus, setSearchScanStatus] = useState("");
  const [searchExtension, setSearchExtension] = useState("");
  const [auditQuery, setAuditQuery] = useState("");
  const [auditAction, setAuditAction] = useState("");
  const [auditSuccess, setAuditSuccess] = useState("all");
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadClassification, setUploadClassification] = useState("INTERNAL");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<RepositoryFile | null>(null);
  const [fileDetailOpen, setFileDetailOpen] = useState(false);
  const [fileActionMessage, setFileActionMessage] = useState<string | null>(null);
  const [rolePermissionRoleId, setRolePermissionRoleId] = useState("");
  const [rolePermissionKey, setRolePermissionKey] = useState("");
  const [roleName, setRoleName] = useState("");
  const [roleCode, setRoleCode] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [roleSaving, setRoleSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsQuotaGb, setSettingsQuotaGb] = useState("");
  const [settingsUploadMb, setSettingsUploadMb] = useState("");
  const [settingsWarning, setSettingsWarning] = useState("80");
  const [settingsBackup, setSettingsBackup] = useState("");
  const [templateEditing, setTemplateEditing] = useState<EmailTemplate | null>(null);
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateTextBody, setTemplateTextBody] = useState("");
  const [templateHtmlBody, setTemplateHtmlBody] = useState("");
  const [templateEnabled, setTemplateEnabled] = useState(true);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderSummary | FolderDetail["folder"] | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderDepartmentId, setFolderDepartmentId] = useState("");
  const [folderSaving, setFolderSaving] = useState(false);
  const [folderMessage, setFolderMessage] = useState<string | null>(null);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [accessResourceType, setAccessResourceType] = useState("FOLDER");
  const [accessResourceId, setAccessResourceId] = useState("");
  const [accessPermissionKey, setAccessPermissionKey] = useState("file.read");
  const [accessJustification, setAccessJustification] = useState("");
  const [accessRequesting, setAccessRequesting] = useState(false);
  const [accessDecisionId, setAccessDecisionId] = useState<string | null>(null);
  const [accessMessage, setAccessMessage] = useState<string | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [userFullName, setUserFullName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userEmployeeCode, setUserEmployeeCode] = useState("");
  const [userCountry, setUserCountry] = useState("India");
  const [userDepartmentId, setUserDepartmentId] = useState("");
  const [userStatus, setUserStatus] = useState("ACTIVE");
  const [userRoleIds, setUserRoleIds] = useState<string[]>([]);
  const [userSaving, setUserSaving] = useState(false);
  const [userMessage, setUserMessage] = useState<string | null>(null);
  const [userStatusUpdatingId, setUserStatusUpdatingId] = useState<string | null>(null);
  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<ManagedDepartment | null>(null);
  const [departmentName, setDepartmentName] = useState("");
  const [departmentCode, setDepartmentCode] = useState("");
  const [departmentDescription, setDepartmentDescription] = useState("");
  const [departmentQuotaGb, setDepartmentQuotaGb] = useState("");
  const [departmentStatus, setDepartmentStatus] = useState("ACTIVE");
  const [departmentSaving, setDepartmentSaving] = useState(false);
  const [departmentMessage, setDepartmentMessage] = useState<string | null>(null);
  const [departmentStatusUpdatingId, setDepartmentStatusUpdatingId] = useState<string | null>(null);
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpRequireTls, setSmtpRequireTls] = useState(true);
  const [smtpFromEmail, setSmtpFromEmail] = useState("");
  const [smtpFromName, setSmtpFromName] = useState("Enterprise File Repository");
  const [smtpReplyTo, setSmtpReplyTo] = useState("");
  const [smtpTestTo, setSmtpTestTo] = useState("");
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpMessage, setSmtpMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = window.localStorage.getItem("filerepo.token");
    const savedUser = window.localStorage.getItem("filerepo.user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser) as LoginResponse["user"]);
    }
  }, []);

  useEffect(() => {
    if (token) {
      void loadDashboard(token);
    }
  }, [token]);

  useEffect(() => {
    const syncModuleFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const module = params.get("module");
      setActiveModule(isModuleId(module) ? module : "dashboard");
    };

    syncModuleFromUrl();
    window.addEventListener("popstate", syncModuleFromUrl);

    return () => window.removeEventListener("popstate", syncModuleFromUrl);
  }, []);

  useEffect(() => {
    if (!data?.smtpSettings) {
      return;
    }

    setSmtpHost(data.smtpSettings.host ?? "");
    setSmtpPort(String(data.smtpSettings.port ?? 587));
    setSmtpUsername(data.smtpSettings.username ?? "");
    setSmtpPassword("");
    setSmtpSecure(data.smtpSettings.secure);
    setSmtpRequireTls(data.smtpSettings.requireTls);
    setSmtpFromEmail(data.smtpSettings.fromEmail ?? "");
    setSmtpFromName(data.smtpSettings.fromName ?? "Enterprise File Repository");
    setSmtpReplyTo(data.smtpSettings.replyTo ?? "");
  }, [data?.smtpSettings]);

  useEffect(() => {
    if (!data?.systemSettings) {
      return;
    }

    setSettingsQuotaGb(bytesStringToGb(String(data.systemSettings.storageQuotaBytes)));
    setSettingsUploadMb((data.systemSettings.maxUploadBytes / 1024 / 1024).toFixed(0));
    setSettingsWarning(String(data.systemSettings.storageWarningThresholdPercent));
    setSettingsBackup(data.systemSettings.backupDestination ?? "");
  }, [data?.systemSettings]);

  function activateModule(module: ModuleId, mode: "push" | "replace" = "push") {
    setActiveModule(module);

    const url = new URL(window.location.href);

    if (module === "dashboard") {
      url.searchParams.delete("module");
    } else {
      url.searchParams.set("module", module);
    }

    const nextUrl = `${url.pathname}${url.search}${url.hash}`;

    if (nextUrl !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history[mode === "replace" ? "replaceState" : "pushState"](null, "", nextUrl);
    }
  }

  const kpis = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      { label: "Total Files", value: formatNumber(data.dashboard.totalFiles), detail: `${formatBytes(data.dashboard.storageUsedBytes)} stored` },
      { label: "Storage Used", value: formatBytes(data.dashboard.storageUsedBytes), detail: `${formatNumber(data.dashboard.totalFiles)} active files` },
      { label: "Active Users", value: formatNumber(data.dashboard.activeUsers), detail: `${formatNumber(data.dashboard.totalUsers)} total users` },
      { label: "Pending Reviews", value: formatNumber(data.dashboard.pendingAccessRequests), detail: "Access requests awaiting decision" }
    ];
  }, [data]);

  const canApproveAccess = Boolean(user?.roles.some((role) => role === "SUPER_ADMIN" || role === "DEPARTMENT_ADMIN"));
  const canReadUsers = canApproveAccess;
  const canWriteUsers = Boolean(user?.roles.includes("SUPER_ADMIN"));
  const canManageDepartments = Boolean(user?.roles.includes("SUPER_ADMIN"));
  const activeModuleConfig = modules.find((module) => module.id === activeModule) ?? modules[0];
  const moduleAccess: Record<ModuleId, boolean> = {
    dashboard: true,
    repository: true,
    recycle: canWriteUsers,
    access: true,
    departments: canManageDepartments,
    users: canReadUsers,
    roles: canWriteUsers,
    audit: canApproveAccess,
    reports: canApproveAccess,
    smtp: canWriteUsers,
    health: canApproveAccess,
    settings: canWriteUsers
  };

  async function loadDashboard(
    activeToken: string,
    query = searchQuery,
    folderId = activeFolderId,
    filters: AuditFilters = { q: auditQuery, action: auditAction, success: auditSuccess }
  ) {
    setLoading(true);
    setError(null);

    try {
      const fileParams = new URLSearchParams({ pageSize: "8" });
      if (query.trim()) {
        fileParams.set("q", query.trim());
      }
      if (searchClassification) {
        fileParams.set("classification", searchClassification);
      }
      if (searchScanStatus) {
        fileParams.set("scanStatus", searchScanStatus);
      }
      if (searchExtension.trim()) {
        fileParams.set("extension", searchExtension.trim());
      }

      const dashboardRequest = apiRequest<Dashboard>("/admin/dashboard", activeToken).catch((caught) => {
        if (caught instanceof ApiError && caught.status === 403) {
          return emptyDashboard;
        }

        throw caught;
      });

      const [
        dashboard,
        health,
        roots,
        fileSearch,
        myAccessRequests,
        approvalRequests,
        managedUsers,
        userOptions,
        departments,
        auditLogs,
        smtpSettings,
        smtpQueue,
        smtpDeliveryLogs,
        roles,
        permissions,
        reportCards,
        deletedFiles,
        deletedFolders,
        systemSettings,
        emailTemplates
      ] = await Promise.all([
        dashboardRequest,
        apiRequest<HealthResponse>("/health"),
        apiRequest<{ data: FolderSummary[] }>("/folders", activeToken),
        apiRequest<{ data: RepositoryFile[] }>(`/files?${fileParams.toString()}`, activeToken),
        apiRequest<{ data: AccessRequest[] }>("/access-requests/mine?pageSize=5", activeToken),
        canApproveAccess
          ? apiRequest<{ data: AccessRequest[] }>("/access-requests?status=PENDING&pageSize=5", activeToken)
          : Promise.resolve({ data: [] }),
        canReadUsers ? apiRequest<{ data: ManagedUser[] }>("/users?pageSize=6", activeToken) : Promise.resolve({ data: [] }),
        canReadUsers ? apiRequest<UserOptions>("/users/options", activeToken) : Promise.resolve(emptyUserOptions),
        canManageDepartments ? apiRequest<{ data: ManagedDepartment[] }>("/departments?pageSize=8", activeToken) : Promise.resolve({ data: [] }),
        canApproveAccess
          ? apiRequest<AuditLogResponse>(auditPath(filters), activeToken)
          : Promise.resolve({ data: [], meta: { page: 1, pageSize: 20, total: 0, pageCount: 1 } }),
        canWriteUsers ? apiRequest<SmtpSettings>("/settings/smtp", activeToken) : Promise.resolve(null),
        canWriteUsers ? apiRequest<EmailQueueCounts>("/settings/smtp/queue", activeToken) : Promise.resolve(null),
        canWriteUsers
          ? apiRequest<{ data: EmailDeliveryLog[] }>("/settings/smtp/delivery-logs", activeToken)
          : Promise.resolve({ data: [] }),
        canWriteUsers ? apiRequest<{ data: RoleSummary[] }>("/roles", activeToken) : Promise.resolve({ data: [] }),
        canWriteUsers ? apiRequest<{ data: PermissionSummary[] }>("/permissions", activeToken) : Promise.resolve({ data: [] }),
        canApproveAccess ? loadReportCards(activeToken) : Promise.resolve([]),
        canWriteUsers ? apiRequest<{ data: RepositoryFile[] }>("/files/recycle-bin", activeToken) : Promise.resolve({ data: [] }),
        canWriteUsers ? apiRequest<{ data: FolderSummary[] }>("/folders/recycle-bin", activeToken) : Promise.resolve({ data: [] }),
        canWriteUsers ? apiRequest<SystemSettings>("/settings/system", activeToken) : Promise.resolve(null),
        canWriteUsers ? apiRequest<{ data: EmailTemplate[] }>("/settings/email-templates", activeToken) : Promise.resolve({ data: [] })
      ]);

      const selectedFolderId = folderId ?? roots.data[0]?.id ?? null;
      const folder = selectedFolderId
        ? await apiRequest<FolderDetail>(`/folders/${selectedFolderId}`, activeToken)
        : null;

      setActiveFolderId(selectedFolderId);

      setData({
        dashboard,
        health,
        roots: roots.data,
        folder,
        files: query.trim() ? fileSearch.data : folder?.files ?? fileSearch.data,
        myAccessRequests: myAccessRequests.data,
        approvalRequests: approvalRequests.data,
        managedUsers: managedUsers.data,
        userOptions,
        departments: departments.data,
        auditLogs: auditLogs.data,
        auditMeta: auditLogs.meta,
        smtpSettings,
        smtpQueue,
        smtpDeliveryLogs: smtpDeliveryLogs.data,
        roles: roles.data,
        permissions: permissions.data,
        reportCards,
        deletedFiles: deletedFiles.data,
        deletedFolders: deletedFolders.data,
        systemSettings,
        emailTemplates: emailTemplates.data
      });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        window.localStorage.removeItem("filerepo.token");
        window.localStorage.removeItem("filerepo.user");
        setToken(null);
        setUser(null);
        setData(null);
        setError("Session expired. Please sign in again.");
        return;
      }

      setError(caught instanceof Error ? caught.message : "Unable to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
    setError(null);

    try {
      const result = await apiRequest<LoginResponse>("/auth/login", undefined, {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      window.localStorage.setItem("filerepo.token", result.accessToken);
      window.localStorage.setItem("filerepo.user", JSON.stringify(result.user));
      setToken(result.accessToken);
      setUser(result.user);
      setPassword("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login failed");
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    window.localStorage.removeItem("filerepo.token");
    window.localStorage.removeItem("filerepo.user");
    setToken(null);
    setUser(null);
    setData(null);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("repositorySearch") ?? "");
    setSearchQuery(query);
    activateModule("repository");

    if (token) {
      void loadDashboard(token, query);
    }
  }

  function handleAuditSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const filters = {
      q: String(formData.get("auditSearch") ?? ""),
      action: String(formData.get("auditAction") ?? ""),
      success: String(formData.get("auditSuccess") ?? "all")
    };

    setAuditQuery(filters.q);
    setAuditAction(filters.action);
    setAuditSuccess(filters.success);
    activateModule("audit");

    if (token) {
      void loadDashboard(token, searchQuery, activeFolderId, filters);
    }
  }

  async function handleSaveSmtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("Please sign in before updating SMTP settings.");
      return;
    }

    setSmtpSaving(true);
    setSmtpMessage(null);
    setError(null);

    try {
      await apiRequest<SmtpSettings>("/settings/smtp", token, {
        method: "PATCH",
        body: JSON.stringify({
          host: smtpHost,
          port: Number(smtpPort),
          username: smtpUsername,
          ...(smtpPassword ? { password: smtpPassword } : {}),
          secure: smtpSecure,
          requireTls: smtpRequireTls,
          fromEmail: smtpFromEmail,
          fromName: smtpFromName,
          replyTo: smtpReplyTo
        })
      });
      setSmtpPassword("");
      setSmtpMessage("SMTP settings saved.");
      await loadDashboard(token, searchQuery, activeFolderId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save SMTP settings");
    } finally {
      setSmtpSaving(false);
    }
  }

  async function handleSmtpTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("Please sign in before sending a test email.");
      return;
    }

    setSmtpTesting(true);
    setSmtpMessage(null);
    setError(null);

    try {
      const result = await apiRequest<{ deliveryLogId: string; jobId: string | number | null }>("/settings/smtp/test", token, {
        method: "POST",
        body: JSON.stringify({ to: smtpTestTo })
      });
      setSmtpMessage(`SMTP test queued. Delivery log: ${result.deliveryLogId}`);
      await loadDashboard(token, searchQuery, activeFolderId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to queue SMTP test email");
    } finally {
      setSmtpTesting(false);
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("Please sign in before uploading.");
      return;
    }

    const folderId = data?.folder?.folder.id ?? activeFolderId ?? data?.roots[0]?.id;

    if (!folderId) {
      setError("No destination folder is available.");
      return;
    }

    if (!uploadFile) {
      setUploadMessage("Choose a file before uploading.");
      return;
    }

    setUploading(true);
    setUploadMessage(null);
    setError(null);

    try {
      const body = new FormData();
      body.append("folderId", folderId);
      body.append("classification", uploadClassification);
      if (uploadDescription.trim()) {
        body.append("description", uploadDescription.trim());
      }
      body.append("file", uploadFile);

      const result = await uploadRequest("/files/upload", token, body);

      try {
        await apiRequest("/admin/scans/run-pending", token, {
          method: "POST",
          body: JSON.stringify({ limit: 10 })
        });
      } catch {
        // Queue workers handle scanning in production; the admin scan call is a local-dev convenience.
      }

      await loadDashboard(token, searchQuery, folderId);
      setUploadFile(null);
      setUploadDescription("");
      setUploadOpen(false);
      setUploadMessage(result.scanQueued === false ? result.scanQueueError ?? "Uploaded, but scan queueing failed." : "Upload complete.");
    } catch (caught) {
      setUploadMessage(caught instanceof Error ? caught.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(file: RepositoryFile) {
    if (!token) {
      setError("Please sign in before downloading.");
      return;
    }

    if (file.currentVersion?.scanStatus !== "CLEAN") {
      setError("This file is not available until antivirus scanning marks it clean.");
      return;
    }

    setDownloadingFileId(file.id);
    setError(null);

    try {
      const response = await fetch(`${apiBase}/files/${file.id}/download`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Download failed: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.originalName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Download failed");
    } finally {
      setDownloadingFileId(null);
    }
  }

  async function handleOpenFile(file: RepositoryFile) {
    if (!token) {
      setError("Please sign in before opening files.");
      return;
    }

    setError(null);
    try {
      const detail = await apiRequest<RepositoryFile>(`/files/${file.id}`, token);
      setSelectedFile(detail);
      setFileDetailOpen(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to open file");
    }
  }

  async function handlePreviewFile(file: RepositoryFile) {
    if (!token) {
      setError("Please sign in before previewing files.");
      return;
    }

    try {
      const response = await fetch(`${apiBase}/files/${file.id}/preview`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Preview failed: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Preview failed");
    }
  }

  async function handleRestoreVersion(versionId: string) {
    if (!token || !selectedFile) {
      return;
    }

    setFileActionMessage(null);
    setError(null);

    try {
      const updated = await apiRequest<RepositoryFile>(`/files/${selectedFile.id}/restore-version`, token, {
        method: "POST",
        body: JSON.stringify({ versionId })
      });
      setSelectedFile(updated);
      setFileActionMessage("Version restored.");
      await loadDashboard(token, searchQuery, activeFolderId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to restore version");
    }
  }

  async function handleDeleteFile(file: RepositoryFile) {
    if (!token) {
      return;
    }

    try {
      await apiRequest(`/files/${file.id}`, token, { method: "DELETE" });
      setFileActionMessage("File moved to recycle bin.");
      await loadDashboard(token, searchQuery, activeFolderId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete file");
    }
  }

  async function handleRestoreRecycleFile(fileId: string) {
    if (!token) {
      return;
    }

    await apiRequest(`/files/${fileId}/restore`, token, { method: "PATCH" });
    await loadDashboard(token, searchQuery, activeFolderId);
  }

  async function handlePermanentDeleteFile(fileId: string) {
    if (!token) {
      return;
    }

    await apiRequest(`/files/${fileId}/permanent`, token, { method: "DELETE" });
    await loadDashboard(token, searchQuery, activeFolderId);
  }

  async function handleRestoreRecycleFolder(folderId: string) {
    if (!token) {
      return;
    }

    await apiRequest(`/folders/${folderId}/restore`, token, { method: "PATCH" });
    await loadDashboard(token, searchQuery, activeFolderId);
  }

  async function handlePermanentDeleteFolder(folderId: string) {
    if (!token) {
      return;
    }

    await apiRequest(`/folders/${folderId}/permanent`, token, { method: "DELETE" });
    await loadDashboard(token, searchQuery, activeFolderId);
  }

  async function handleAssignRolePermission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !rolePermissionRoleId || !rolePermissionKey) {
      return;
    }

    setRoleSaving(true);
    setError(null);

    try {
      await apiRequest(`/roles/${rolePermissionRoleId}/permissions`, token, {
        method: "POST",
        body: JSON.stringify({ permissionKey: rolePermissionKey })
      });
      await loadDashboard(token, searchQuery, activeFolderId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to assign permission");
    } finally {
      setRoleSaving(false);
    }
  }

  async function handleCreateRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !roleName.trim() || !roleCode.trim()) {
      return;
    }

    setRoleSaving(true);
    setError(null);

    try {
      await apiRequest("/roles", token, {
        method: "POST",
        body: JSON.stringify({
          name: roleName.trim(),
          code: roleCode.trim(),
          description: roleDescription.trim() || undefined
        })
      });
      setRoleName("");
      setRoleCode("");
      setRoleDescription("");
      await loadDashboard(token, searchQuery, activeFolderId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create role");
    } finally {
      setRoleSaving(false);
    }
  }

  async function handleSaveSystemSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      return;
    }

    setSettingsSaving(true);
    setError(null);

    try {
      await apiRequest<SystemSettings>("/settings/system", token, {
        method: "PATCH",
        body: JSON.stringify({
          maxUploadBytes: Math.round(Number(settingsUploadMb || 0) * 1024 * 1024),
          storageQuotaBytes: gbInputToBytes(settingsQuotaGb) ?? 0,
          storageWarningThresholdPercent: Number(settingsWarning),
          backupDestination: settingsBackup
        })
      });
      await loadDashboard(token, searchQuery, activeFolderId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save system settings");
    } finally {
      setSettingsSaving(false);
    }
  }

  function openTemplateEditor(template: EmailTemplate) {
    setTemplateEditing(template);
    setTemplateSubject(template.subject);
    setTemplateTextBody(template.textBody);
    setTemplateHtmlBody(template.htmlBody);
    setTemplateEnabled(template.isEnabled);
  }

  async function handleSaveTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !templateEditing) {
      return;
    }

    setTemplateSaving(true);
    setError(null);

    try {
      await apiRequest<EmailTemplate>(`/settings/email-templates/${templateEditing.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({
          subject: templateSubject,
          textBody: templateTextBody,
          htmlBody: templateHtmlBody,
          isEnabled: templateEnabled
        })
      });
      setTemplateEditing(null);
      await loadDashboard(token, searchQuery, activeFolderId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save template");
    } finally {
      setTemplateSaving(false);
    }
  }

  async function handleOpenFolder(folderId: string | null) {
    if (!token) {
      setError("Please sign in before browsing folders.");
      return;
    }

    setActiveFolderId(folderId);
    await loadDashboard(token, searchQuery, folderId);
  }

  function openCreateFolder() {
    setEditingFolder(null);
    setFolderName("");
    setFolderDepartmentId(data?.folder?.folder.departmentId ?? data?.userOptions.departments[0]?.id ?? "");
    setFolderMessage(null);
    setFolderModalOpen(true);
  }

  function openEditFolder(folder: FolderSummary | FolderDetail["folder"]) {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderDepartmentId(folder.departmentId ?? "");
    setFolderMessage(null);
    setFolderModalOpen(true);
  }

  async function handleSaveFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("Please sign in before managing folders.");
      return;
    }

    if (!folderName.trim()) {
      setFolderMessage("Folder name is required.");
      return;
    }

    setFolderSaving(true);
    setFolderMessage(null);
    setError(null);

    try {
      if (editingFolder) {
        await apiRequest<FolderSummary>(`/folders/${editingFolder.id}`, token, {
          method: "PATCH",
          body: JSON.stringify({
            name: folderName.trim()
          })
        });
      } else {
        await apiRequest<FolderSummary>("/folders", token, {
          method: "POST",
          body: JSON.stringify({
            name: folderName.trim(),
            parentId: data?.folder?.folder.id ?? activeFolderId ?? undefined,
            departmentId: data?.folder?.folder.id ? undefined : folderDepartmentId || undefined
          })
        });
      }

      await loadDashboard(token, searchQuery, data?.folder?.folder.id ?? activeFolderId);
      setFolderModalOpen(false);
      setFolderMessage(editingFolder ? "Folder renamed." : "Folder created.");
    } catch (caught) {
      setFolderMessage(caught instanceof Error ? caught.message : "Unable to save folder");
    } finally {
      setFolderSaving(false);
    }
  }

  async function handleCreateAccessRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("Please sign in before requesting access.");
      return;
    }

    if (!accessResourceId.trim() || !accessJustification.trim()) {
      setAccessMessage("Resource ID and business justification are required.");
      return;
    }

    setAccessRequesting(true);
    setAccessMessage(null);
    setError(null);

    try {
      await apiRequest<AccessRequest>("/access-requests", token, {
        method: "POST",
        body: JSON.stringify({
          resourceType: accessResourceType,
          resourceId: accessResourceId.trim(),
          permissionKey: accessPermissionKey,
          businessJustification: accessJustification.trim()
        })
      });

      await loadDashboard(token, searchQuery);
      setAccessResourceId("");
      setAccessJustification("");
      setAccessModalOpen(false);
      setAccessMessage("Access request submitted.");
    } catch (caught) {
      setAccessMessage(caught instanceof Error ? caught.message : "Access request failed");
    } finally {
      setAccessRequesting(false);
    }
  }

  async function handleAccessDecision(requestId: string, decision: "approve" | "reject") {
    if (!token) {
      setError("Please sign in before reviewing access.");
      return;
    }

    setAccessDecisionId(requestId);
    setAccessMessage(null);
    setError(null);

    try {
      await apiRequest<AccessRequest>(`/access-requests/${requestId}/${decision}`, token, {
        method: "POST",
        body: JSON.stringify({
          decisionReason: decision === "approve" ? "Approved from ERP dashboard" : "Rejected from ERP dashboard"
        })
      });

      await loadDashboard(token, searchQuery);
      setAccessMessage(decision === "approve" ? "Access request approved." : "Access request rejected.");
    } catch (caught) {
      setAccessMessage(caught instanceof Error ? caught.message : "Access decision failed");
    } finally {
      setAccessDecisionId(null);
    }
  }

  function openCreateUser() {
    const defaultRole = data?.userOptions.roles.find((role) => role.code === "EMPLOYEE") ?? data?.userOptions.roles[0];
    setEditingUser(null);
    setUserFullName("");
    setUserEmail("");
    setUserPassword("");
    setUserEmployeeCode("");
    setUserCountry("India");
    setUserDepartmentId(data?.userOptions.departments[0]?.id ?? "");
    setUserStatus("ACTIVE");
    setUserRoleIds(defaultRole ? [defaultRole.id] : []);
    setUserMessage(null);
    setUserModalOpen(true);
  }

  function openEditUser(target: ManagedUser) {
    setEditingUser(target);
    setUserFullName(target.fullName);
    setUserEmail(target.email);
    setUserPassword("");
    setUserEmployeeCode(target.employeeCode ?? "");
    setUserCountry(target.country ?? "");
    setUserDepartmentId(target.departmentId ?? "");
    setUserStatus(target.status);
    setUserRoleIds(target.roles.map((role) => role.id));
    setUserMessage(null);
    setUserModalOpen(true);
  }

  function toggleUserRole(roleId: string) {
    setUserRoleIds((current) => (current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId]));
  }

  async function handleSaveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("Please sign in before managing users.");
      return;
    }

    if (!userFullName.trim() || (!editingUser && (!userEmail.trim() || !userPassword.trim()))) {
      setUserMessage("Name, email, and password are required for new users.");
      return;
    }

    setUserSaving(true);
    setUserMessage(null);
    setError(null);

    try {
      if (editingUser) {
        await apiRequest<ManagedUser>(`/users/${editingUser.id}`, token, {
          method: "PATCH",
          body: JSON.stringify({
            fullName: userFullName.trim(),
            employeeCode: userEmployeeCode.trim() || null,
            country: userCountry.trim() || null,
            timezone: "Asia/Calcutta",
            departmentId: userDepartmentId || null,
            status: userStatus,
            roleIds: userRoleIds
          })
        });
      } else {
        await apiRequest<ManagedUser>("/users", token, {
          method: "POST",
          body: JSON.stringify({
            fullName: userFullName.trim(),
            email: userEmail.trim(),
            password: userPassword.trim(),
            employeeCode: userEmployeeCode.trim() || undefined,
            country: userCountry.trim() || undefined,
            timezone: "Asia/Calcutta",
            departmentId: userDepartmentId || undefined,
            roleIds: userRoleIds
          })
        });
      }

      await loadDashboard(token, searchQuery);
      setUserModalOpen(false);
      setUserMessage(editingUser ? "User updated." : "User created.");
    } catch (caught) {
      setUserMessage(caught instanceof Error ? caught.message : "Unable to save user");
    } finally {
      setUserSaving(false);
    }
  }

  async function handleUserStatus(target: ManagedUser, status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED") {
    if (!token) {
      setError("Please sign in before managing users.");
      return;
    }

    setUserStatusUpdatingId(target.id);
    setUserMessage(null);
    setError(null);

    try {
      await apiRequest<ManagedUser>(`/users/${target.id}/status`, token, {
        method: "POST",
        body: JSON.stringify({ status })
      });
      await loadDashboard(token, searchQuery);
      setUserMessage(status === "ACTIVE" ? "User reactivated." : "User status updated.");
    } catch (caught) {
      setUserMessage(caught instanceof Error ? caught.message : "Unable to update user status");
    } finally {
      setUserStatusUpdatingId(null);
    }
  }

  function openCreateDepartment() {
    setEditingDepartment(null);
    setDepartmentName("");
    setDepartmentCode("");
    setDepartmentDescription("");
    setDepartmentQuotaGb("");
    setDepartmentStatus("ACTIVE");
    setDepartmentMessage(null);
    setDepartmentModalOpen(true);
  }

  function openEditDepartment(target: ManagedDepartment) {
    setEditingDepartment(target);
    setDepartmentName(target.name);
    setDepartmentCode(target.code);
    setDepartmentDescription(target.description ?? "");
    setDepartmentQuotaGb(bytesStringToGb(target.storageQuotaBytes));
    setDepartmentStatus(target.status);
    setDepartmentMessage(null);
    setDepartmentModalOpen(true);
  }

  async function handleSaveDepartment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("Please sign in before managing departments.");
      return;
    }

    if (!departmentName.trim() || !departmentCode.trim()) {
      setDepartmentMessage("Department name and code are required.");
      return;
    }

    setDepartmentSaving(true);
    setDepartmentMessage(null);
    setError(null);

    try {
      const storageQuotaBytes = gbInputToBytes(departmentQuotaGb);
      const body = {
        name: departmentName.trim(),
        code: departmentCode.trim(),
        description: departmentDescription.trim() || null,
        storageQuotaBytes,
        status: departmentStatus
      };

      if (editingDepartment) {
        await apiRequest<ManagedDepartment>(`/departments/${editingDepartment.id}`, token, {
          method: "PATCH",
          body: JSON.stringify(body)
        });
      } else {
        await apiRequest<ManagedDepartment>("/departments", token, {
          method: "POST",
          body: JSON.stringify(body)
        });
      }

      await loadDashboard(token, searchQuery);
      setDepartmentModalOpen(false);
      setDepartmentMessage(editingDepartment ? "Department updated." : "Department created.");
    } catch (caught) {
      setDepartmentMessage(caught instanceof Error ? caught.message : "Unable to save department");
    } finally {
      setDepartmentSaving(false);
    }
  }

  async function handleDepartmentStatus(target: ManagedDepartment, status: "ACTIVE" | "INACTIVE") {
    if (!token) {
      setError("Please sign in before managing departments.");
      return;
    }

    setDepartmentStatusUpdatingId(target.id);
    setDepartmentMessage(null);
    setError(null);

    try {
      await apiRequest<ManagedDepartment>(`/departments/${target.id}/status`, token, {
        method: "POST",
        body: JSON.stringify({ status })
      });
      await loadDashboard(token, searchQuery);
      setDepartmentMessage(status === "ACTIVE" ? "Department activated." : "Department marked inactive.");
    } catch (caught) {
      setDepartmentMessage(caught instanceof Error ? caught.message : "Unable to update department status");
    } finally {
      setDepartmentStatusUpdatingId(null);
    }
  }

  if (!token || !user) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <div className="brand login-brand">
            <div className="brand-mark">EFR</div>
            <div>
              <p className="brand-title">File Repository</p>
              <p className="brand-subtitle">Enterprise ERP Module</p>
            </div>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <div>
              <p className="eyebrow">Secure Workspace</p>
              <h1>Company File Repository</h1>
            </div>
            <label>
              <span>Email</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />
            </label>
            <label>
              <span>Password</span>
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
            </label>
            {error ? <p className="error-text">{error}</p> : null}
            <button className="primary-button" type="submit" disabled={authLoading}>
              <ShieldCheck aria-hidden="true" size={17} />
              {authLoading ? "Signing in" : "Sign in"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">EFR</div>
          <div>
            <p className="brand-title">File Repository</p>
            <p className="brand-subtitle">Enterprise ERP Module</p>
          </div>
        </div>

        <nav className="nav-list" aria-label="Main modules">
          {modules.map((module) => {
            const Icon = module.icon;
            const hasAccess = moduleAccess[module.id];
            return (
              <button
                className={activeModule === module.id ? "nav-item active" : "nav-item"}
                key={module.id}
                type="button"
                onClick={() => activateModule(module.id)}
              >
                <Icon aria-hidden="true" size={18} />
                <span>{module.name}</span>
                {!hasAccess ? <LockKeyhole aria-hidden="true" className="nav-lock" size={13} /> : null}
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <form className="search-box" onSubmit={handleSearch}>
            <Search aria-hidden="true" size={18} />
            <input
              aria-label="Search files"
              name="repositorySearch"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search files by name, extension, description..."
            />
            <button type="submit" title="Search files">
              <Search aria-hidden="true" size={16} />
            </button>
          </form>
          <div className="topbar-actions">
            <button className="icon-button" type="button" title="Refresh" onClick={() => void loadDashboard(token)}>
              <RefreshCcw aria-hidden="true" size={18} />
            </button>
            <button className="icon-button" type="button" title="Notifications">
              <Bell aria-hidden="true" size={18} />
            </button>
            <button className="profile-button" type="button" title={user.email}>
              {user.fullName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
            </button>
            <button className="icon-button" type="button" title="Logout" onClick={handleLogout}>
              <LogOut aria-hidden="true" size={18} />
            </button>
          </div>
        </header>

        <div className="content">
          <section className="page-heading">
            <div>
              <p className="eyebrow">{activeModuleConfig.eyebrow}</p>
              <h1>{activeModuleConfig.name}</h1>
              <p className="page-copy">Signed in as {user.fullName} with {user.roles.join(", ") || "assigned"} access.</p>
            </div>
            <div className="heading-actions">
              {activeModule === "repository" ? (
                <>
                  <button className="secondary-button" type="button" onClick={() => activateModule("recycle")}>
                    <ArchiveRestore aria-hidden="true" size={17} />
                    Recycle Bin
                  </button>
                  <button className="primary-button" type="button" onClick={() => setUploadOpen(true)}>
                    <Upload aria-hidden="true" size={17} />
                    Upload
                  </button>
                </>
              ) : null}
              {activeModule === "access" ? (
                <button className="primary-button" type="button" onClick={() => setAccessModalOpen(true)}>
                  <KeyRound aria-hidden="true" size={17} />
                  New Request
                </button>
              ) : null}
              {activeModule === "departments" && canManageDepartments ? (
                <button className="primary-button" type="button" onClick={openCreateDepartment}>
                  <Building2 aria-hidden="true" size={17} />
                  New Department
                </button>
              ) : null}
              {activeModule === "users" && canWriteUsers ? (
                <button className="primary-button" type="button" onClick={openCreateUser}>
                  <Users aria-hidden="true" size={17} />
                  New User
                </button>
              ) : null}
            </div>
          </section>

          {error ? <p className="error-banner">{error}</p> : null}
          {uploadMessage ? <p className="loading-banner">{uploadMessage}</p> : null}
          {folderMessage ? <p className="loading-banner">{folderMessage}</p> : null}
          {accessMessage ? <p className="loading-banner">{accessMessage}</p> : null}
          {userMessage ? <p className="loading-banner">{userMessage}</p> : null}
          {departmentMessage ? <p className="loading-banner">{departmentMessage}</p> : null}
          {smtpMessage ? <p className="loading-banner">{smtpMessage}</p> : null}
          {loading && !data ? <p className="loading-banner">Loading live repository data...</p> : null}

          {!moduleAccess[activeModule] ? (
            <section className="panel module-placeholder">
              <div className="module-status-icon">
                <LockKeyhole aria-hidden="true" size={22} />
              </div>
              <div>
                <h2>Access Restricted</h2>
                <p>Your current role does not include this module.</p>
              </div>
            </section>
          ) : null}

          {activeModule === "dashboard" ? (
            <section className="kpi-grid" aria-label="Repository metrics">
              {kpis.map((kpi) => (
                <article className="metric" key={kpi.label}>
                  <p>{kpi.label}</p>
                  <strong>{kpi.value}</strong>
                  <span>{kpi.detail}</span>
                </article>
              ))}
            </section>
          ) : null}

          {activeModule === "repository" ? (
          <section className="two-column">
            <article className="panel large-panel">
              <div className="panel-header">
                <div>
                  <h2>Repository Workspace</h2>
                  <p>{data?.folder?.folder.pathCache ?? "No folder selected"}</p>
                </div>
                <div className="panel-actions">
                  <button
                    className="text-button"
                    type="button"
                    disabled={!data?.folder?.folder.parentId}
                    onClick={() => void handleOpenFolder(data?.folder?.folder.parentId ?? null)}
                  >
                    <ArrowLeft aria-hidden="true" size={15} />
                    Up
                  </button>
                  <button className="text-button" type="button" onClick={openCreateFolder}>
                    <FolderPlus aria-hidden="true" size={15} />
                    New Folder
                  </button>
                  {data?.folder?.folder ? (
                    <button className="text-button" type="button" onClick={() => openEditFolder(data.folder!.folder)}>
                      <Pencil aria-hidden="true" size={15} />
                      Rename
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="breadcrumb-list" aria-label="Folder breadcrumbs">
                {(data?.folder?.breadcrumbs ?? []).map((crumb) => (
                  <button type="button" key={crumb.id} onClick={() => void handleOpenFolder(crumb.id)}>
                    {crumb.name}
                  </button>
                ))}
              </div>

              <form className="module-filter-bar" onSubmit={handleSearch}>
                <label>
                  <span>Search</span>
                  <input
                    name="repositorySearch"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Name, extension, description"
                  />
                </label>
                <label>
                  <span>Classification</span>
                  <select value={searchClassification} onChange={(event) => setSearchClassification(event.target.value)}>
                    <option value="">All</option>
                    <option value="PUBLIC_INTERNAL">Public Internal</option>
                    <option value="INTERNAL">Internal</option>
                    <option value="CONFIDENTIAL">Confidential</option>
                    <option value="RESTRICTED">Restricted</option>
                  </select>
                </label>
                <label>
                  <span>Scan</span>
                  <select value={searchScanStatus} onChange={(event) => setSearchScanStatus(event.target.value)}>
                    <option value="">All</option>
                    <option value="PENDING">Pending</option>
                    <option value="SCANNING">Scanning</option>
                    <option value="CLEAN">Clean</option>
                    <option value="INFECTED">Infected</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </label>
                <label>
                  <span>Ext</span>
                  <input value={searchExtension} onChange={(event) => setSearchExtension(event.target.value)} placeholder="pdf" />
                </label>
                <button className="primary-button" type="submit">
                  <Search aria-hidden="true" size={16} />
                  Apply
                </button>
              </form>

              <div className="toolbar">
                <button type="button">{data?.roots.length ?? 0} root folders</button>
                <button type="button">{data?.folder?.children.length ?? 0} child folders</button>
                <button type="button">{data?.files.length ?? 0} {searchQuery.trim() ? "matching" : "folder"} files</button>
                <button type="button">{data?.dashboard.smtpStatus ?? "smtp"} SMTP</button>
              </div>

              <div className="folder-grid" aria-label="Child folders">
                {(data?.folder?.children ?? []).map((folder) => (
                  <article className="folder-card" key={folder.id}>
                    <button type="button" onClick={() => void handleOpenFolder(folder.id)}>
                      <FolderTree aria-hidden="true" size={18} />
                      <span>
                        <strong>{folder.name}</strong>
                        <small>{folder.childFolderCount} folders · {folder.fileCount} files</small>
                      </span>
                    </button>
                    <button className="row-icon-button" type="button" title={`Rename ${folder.name}`} onClick={() => openEditFolder(folder)}>
                      <Pencil aria-hidden="true" size={14} />
                    </button>
                  </article>
                ))}
              </div>

              <div className="data-table" role="table" aria-label="Repository files">
                <div className="table-row table-head" role="row">
                  <span role="columnheader">Name</span>
                  <span role="columnheader">Owner</span>
                  <span role="columnheader">Class</span>
                  <span role="columnheader">Status</span>
                  <span role="columnheader">Updated</span>
                  <span role="columnheader">Action</span>
                </div>
                {(data?.files ?? []).map((file) => (
                  <div className="table-row" role="row" key={file.id}>
                    <span role="cell" className="file-name">
                      <FileText aria-hidden="true" size={16} />
                      {file.originalName}
                    </span>
                    <span role="cell">{file.createdBy?.fullName ?? file.department?.name ?? "System"}</span>
                    <span role="cell">
                      <span className={`badge ${file.classification.toLowerCase()}`}>{titleCase(file.classification)}</span>
                    </span>
                    <span role="cell">
                      <span className={`status ${file.currentVersion?.scanStatus.toLowerCase() ?? "pending"}`}>
                        {titleCase(file.currentVersion?.scanStatus ?? "PENDING")}
                      </span>
                    </span>
                    <span role="cell">{formatDate(file.updatedAt)}</span>
                    <span role="cell" className="table-actions">
                      <button
                        className="row-icon-button"
                        type="button"
                        title={`Open ${file.originalName}`}
                        onClick={() => void handleOpenFile(file)}
                      >
                        <FileText aria-hidden="true" size={15} />
                      </button>
                      <button
                        className="row-icon-button"
                        type="button"
                        title={`Preview ${file.originalName}`}
                        disabled={file.currentVersion?.scanStatus !== "CLEAN"}
                        onClick={() => void handlePreviewFile(file)}
                      >
                        <Search aria-hidden="true" size={15} />
                      </button>
                      <button
                        className="row-icon-button"
                        type="button"
                        title={`Download ${file.originalName}`}
                        disabled={file.currentVersion?.scanStatus !== "CLEAN" || downloadingFileId === file.id}
                        onClick={() => void handleDownload(file)}
                      >
                        <Download aria-hidden="true" size={15} />
                      </button>
                      <button
                        className="row-icon-button danger"
                        type="button"
                        title={`Delete ${file.originalName}`}
                        onClick={() => void handleDeleteFile(file)}
                      >
                        <XCircle aria-hidden="true" size={15} />
                      </button>
                    </span>
                  </div>
                ))}
                {data && data.files.length === 0 ? <p className="empty-state">No files match the current search.</p> : null}
              </div>
            </article>

            <aside className="panel">
              <div className="panel-header">
                <div>
                  <h2>Quick Access</h2>
                  <p>Daily user shortcuts</p>
                </div>
              </div>
              <div className="shortcut-grid">
                <button type="button"><Heart size={17} /> Favorites</button>
                <button type="button"><Activity size={17} /> Recent</button>
                <button type="button" onClick={() => setAccessModalOpen(true)}><KeyRound size={17} /> Access Requests</button>
                <button type="button"><ShieldCheck size={17} /> My Permissions</button>
              </div>
            </aside>
          </section>
          ) : null}

          {activeModule === "recycle" && moduleAccess.recycle ? (
            <section className="two-column">
              <article className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Deleted Files</h2>
                    <p>{data?.deletedFiles.length ?? 0} files in recycle bin</p>
                  </div>
                </div>
                <div className="request-list">
                  {(data?.deletedFiles ?? []).map((file) => (
                    <div className="request-item" key={file.id}>
                      <div>
                        <strong>{file.originalName}</strong>
                        <span>{file.folder?.pathCache ?? "Repository"} · {file.currentVersion ? formatBytes(Number(file.currentVersion.sizeBytes)) : "0 B"}</span>
                      </div>
                      <div className="decision-actions">
                        <button className="row-text-button" type="button" onClick={() => void handleRestoreRecycleFile(file.id)}>Restore</button>
                        <button className="row-text-button" type="button" onClick={() => void handlePermanentDeleteFile(file.id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                  {data && data.deletedFiles.length === 0 ? <p className="empty-state">No deleted files.</p> : null}
                </div>
              </article>

              <article className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Deleted Folders</h2>
                    <p>{data?.deletedFolders.length ?? 0} folders in recycle bin</p>
                  </div>
                </div>
                <div className="request-list">
                  {(data?.deletedFolders ?? []).map((folder) => (
                    <div className="request-item" key={folder.id}>
                      <div>
                        <strong>{folder.name}</strong>
                        <span>{folder.pathCache ?? "Repository"} · {folder.fileCount} files</span>
                      </div>
                      <div className="decision-actions">
                        <button className="row-text-button" type="button" onClick={() => void handleRestoreRecycleFolder(folder.id)}>Restore</button>
                        <button className="row-text-button" type="button" onClick={() => void handlePermanentDeleteFolder(folder.id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                  {data && data.deletedFolders.length === 0 ? <p className="empty-state">No deleted folders.</p> : null}
                </div>
              </article>
            </section>
          ) : null}

          {activeModule === "dashboard" ? (
          <section className="two-column bottom-row">
            <article className="panel">
              <div className="panel-header">
                <div>
                  <h2>System Health</h2>
                  <p>{data?.health.status ?? "loading"}</p>
                </div>
              </div>
              <div className="health-list">
                {(data?.health.checks ?? []).map((item) => (
                  <div className="health-item" key={item.name}>
                    <span><Database size={16} /> {titleCase(item.name)}</span>
                    <strong className={`health-state ${item.status}`}>{titleCase(item.status)}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel">
              <div className="panel-header">
                <div>
                  <h2>Recent Activity</h2>
                  <p>Audit-friendly event stream</p>
                </div>
              </div>
              <ol className="activity-list">
                {(data?.dashboard.recentActivity ?? []).map((activity) => (
                  <li key={activity.id}>
                    <strong>{titleCase(activity.action)}</strong>
                    <span>{activity.entityName ?? activity.actor} · {formatDate(activity.createdAt)}</span>
                  </li>
                ))}
              </ol>
            </article>
          </section>
          ) : null}

          {activeModule === "access" ? (
          <section className="two-column access-row">
            <article className="panel">
              <div className="panel-header">
                <div>
                  <h2>My Access Requests</h2>
                  <p>{data?.myAccessRequests.length ?? 0} recent requests</p>
                </div>
                <button className="text-button" type="button" onClick={() => setAccessModalOpen(true)}>New</button>
              </div>
              <div className="request-list">
                {(data?.myAccessRequests ?? []).map((request) => (
                  <div className="request-item" key={request.id}>
                    <div>
                      <strong>{titleCase(request.resourceType)} · {request.permissionKey}</strong>
                      <span>{request.resourceId}</span>
                    </div>
                    <span className={`status ${request.status.toLowerCase()}`}>{titleCase(request.status)}</span>
                  </div>
                ))}
                {data && data.myAccessRequests.length === 0 ? <p className="empty-state">No access requests submitted.</p> : null}
              </div>
            </article>

            <article className="panel">
              <div className="panel-header">
                <div>
                  <h2>Approval Queue</h2>
                  <p>{canApproveAccess ? `${data?.approvalRequests.length ?? 0} pending decisions` : "Reviewer access required"}</p>
                </div>
              </div>
              <div className="request-list">
                {canApproveAccess
                  ? (data?.approvalRequests ?? []).map((request) => (
                      <div className="request-item review-item" key={request.id}>
                        <div>
                          <strong>{request.requester?.fullName ?? request.requester?.email ?? "Requester"}</strong>
                          <span>{titleCase(request.resourceType)} · {request.permissionKey}</span>
                        </div>
                        <div className="decision-actions">
                          <button
                            className="row-icon-button"
                            type="button"
                            title="Approve request"
                            disabled={accessDecisionId === request.id}
                            onClick={() => void handleAccessDecision(request.id, "approve")}
                          >
                            <CheckCircle2 aria-hidden="true" size={15} />
                          </button>
                          <button
                            className="row-icon-button danger"
                            type="button"
                            title="Reject request"
                            disabled={accessDecisionId === request.id}
                            onClick={() => void handleAccessDecision(request.id, "reject")}
                          >
                            <XCircle aria-hidden="true" size={15} />
                          </button>
                        </div>
                      </div>
                    ))
                  : null}
                {canApproveAccess && data && data.approvalRequests.length === 0 ? <p className="empty-state">No pending access requests.</p> : null}
              </div>
            </article>
          </section>
          ) : null}

          {activeModule === "departments" && canManageDepartments ? (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Department Management</h2>
                  <p>{data?.departments.length ?? 0} departments with quota and usage</p>
                </div>
                <button className="primary-button" type="button" onClick={openCreateDepartment}>
                  <Building2 aria-hidden="true" size={17} />
                  New Department
                </button>
              </div>

              <div className="department-grid" role="table" aria-label="Departments">
                <div className="department-row department-head" role="row">
                  <span role="columnheader">Department</span>
                  <span role="columnheader">Users</span>
                  <span role="columnheader">Files</span>
                  <span role="columnheader">Storage</span>
                  <span role="columnheader">Status</span>
                  <span role="columnheader">Actions</span>
                </div>
                {(data?.departments ?? []).map((department) => (
                  <div className="department-row" role="row" key={department.id}>
                    <span role="cell">
                      <strong>{department.name}</strong>
                      <small>{department.code}{department.description ? ` · ${department.description}` : ""}</small>
                    </span>
                    <span role="cell">{formatNumber(department.userCount)}</span>
                    <span role="cell">{formatNumber(department.fileCount)}</span>
                    <span role="cell">
                      <strong>{formatBytes(Number(department.storageUsedBytes))}</strong>
                      <small>
                        {department.storageQuotaBytes
                          ? `${department.quotaUsedPercent ?? 0}% of ${formatBytes(Number(department.storageQuotaBytes))}`
                          : "No quota"}
                      </small>
                    </span>
                    <span role="cell">
                      <span className={`status ${department.status.toLowerCase()}`}>{titleCase(department.status)}</span>
                    </span>
                    <span role="cell" className="user-actions">
                      <button className="row-text-button" type="button" onClick={() => openEditDepartment(department)}>
                        Edit
                      </button>
                      <button
                        className="row-text-button"
                        type="button"
                        disabled={departmentStatusUpdatingId === department.id}
                        onClick={() => void handleDepartmentStatus(department, department.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
                      >
                        {department.status === "ACTIVE" ? "Disable" : "Activate"}
                      </button>
                    </span>
                  </div>
                ))}
                {data && data.departments.length === 0 ? <p className="empty-state">No departments configured.</p> : null}
              </div>
            </section>
          ) : null}

          {activeModule === "users" && canReadUsers ? (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>User Management</h2>
                  <p>{data?.managedUsers.length ?? 0} recently managed users</p>
                </div>
                {canWriteUsers ? (
                  <button className="primary-button" type="button" onClick={openCreateUser}>
                    <Users aria-hidden="true" size={17} />
                    New User
                  </button>
                ) : null}
              </div>

              <div className="user-grid" role="table" aria-label="Managed users">
                <div className="user-row user-head" role="row">
                  <span role="columnheader">User</span>
                  <span role="columnheader">Department</span>
                  <span role="columnheader">Roles</span>
                  <span role="columnheader">Status</span>
                  <span role="columnheader">Last Login</span>
                  <span role="columnheader">Actions</span>
                </div>
                {(data?.managedUsers ?? []).map((managedUser) => (
                  <div className="user-row" role="row" key={managedUser.id}>
                    <span role="cell">
                      <strong>{managedUser.fullName}</strong>
                      <small>{managedUser.email}</small>
                    </span>
                    <span role="cell">{managedUser.department?.name ?? "Unassigned"}</span>
                    <span role="cell">{managedUser.roles.map((role) => role.name).join(", ") || "No roles"}</span>
                    <span role="cell">
                      <span className={`status ${managedUser.status.toLowerCase()}`}>{titleCase(managedUser.status)}</span>
                    </span>
                    <span role="cell">{managedUser.lastLoginAt ? formatDate(managedUser.lastLoginAt) : "Never"}</span>
                    <span role="cell" className="user-actions">
                      {canWriteUsers ? (
                        <>
                          <button className="row-text-button" type="button" onClick={() => openEditUser(managedUser)}>
                            Edit
                          </button>
                          <button
                            className="row-text-button"
                            type="button"
                            disabled={userStatusUpdatingId === managedUser.id}
                            onClick={() => void handleUserStatus(managedUser, managedUser.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}
                          >
                            {managedUser.status === "ACTIVE" ? "Suspend" : "Activate"}
                          </button>
                        </>
                      ) : (
                        "View"
                      )}
                    </span>
                  </div>
                ))}
                {data && data.managedUsers.length === 0 ? <p className="empty-state">No users available for your scope.</p> : null}
              </div>
            </section>
          ) : null}

          {activeModule === "health" && moduleAccess.health ? (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>System Health</h2>
                  <p>{data?.health.status ?? "loading"}</p>
                </div>
                <button className="text-button" type="button" onClick={() => void loadDashboard(token)}>
                  <RefreshCcw aria-hidden="true" size={15} />
                  Refresh
                </button>
              </div>
              <div className="health-list module-health-list">
                {(data?.health.checks ?? []).map((item) => (
                  <div className="health-item" key={item.name}>
                    <span><Database size={16} /> {titleCase(item.name)}</span>
                    <strong className={`health-state ${item.status}`}>{titleCase(item.status)}</strong>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {activeModule === "roles" && moduleAccess.roles ? (
            <section className="two-column">
              <article className="panel">
              <div className="panel-header">
                <div>
                  <h2>Roles & RBAC</h2>
                  <p>{data?.roles.length ?? 0} roles and {data?.permissions.length ?? 0} permissions</p>
                </div>
              </div>

              <form className="module-filter-bar" onSubmit={handleAssignRolePermission}>
                <label>
                  <span>Role</span>
                  <select value={rolePermissionRoleId} onChange={(event) => setRolePermissionRoleId(event.target.value)}>
                    <option value="">Select role</option>
                    {(data?.roles ?? []).map((role) => (
                      <option value={role.id} key={role.id}>{role.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Permission</span>
                  <select value={rolePermissionKey} onChange={(event) => setRolePermissionKey(event.target.value)}>
                    <option value="">Select permission</option>
                    {(data?.permissions ?? []).map((permission) => (
                      <option value={permission.key} key={permission.key}>{permission.key}</option>
                    ))}
                  </select>
                </label>
                <button className="primary-button" type="submit" disabled={roleSaving || !rolePermissionRoleId || !rolePermissionKey}>
                  <LockKeyhole aria-hidden="true" size={16} />
                  Assign
                </button>
              </form>

              <form className="module-filter-bar" onSubmit={handleCreateRole}>
                <label>
                  <span>Role Name</span>
                  <input value={roleName} onChange={(event) => setRoleName(event.target.value)} placeholder="Compliance Auditor" />
                </label>
                <label>
                  <span>Code</span>
                  <input value={roleCode} onChange={(event) => setRoleCode(event.target.value)} placeholder="COMPLIANCE_AUDITOR" />
                </label>
                <label>
                  <span>Description</span>
                  <input value={roleDescription} onChange={(event) => setRoleDescription(event.target.value)} placeholder="Optional" />
                </label>
                <button className="secondary-button" type="submit" disabled={roleSaving || !roleName.trim() || !roleCode.trim()}>
                  <LockKeyhole aria-hidden="true" size={16} />
                  New Role
                </button>
              </form>

              <div className="role-list">
                {(data?.roles ?? []).map((role) => (
                  <article className="role-card" key={role.id}>
                    <div>
                      <strong>{role.name}</strong>
                      <span>{role.code} · {role.permissions.length} permissions</span>
                    </div>
                    <div className="permission-chips">
                      {role.permissions.slice(0, 8).map((permission) => (
                        <span key={permission.permissionKey}>{permission.permissionKey}</span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
              </article>

              <aside className="panel">
                <div className="panel-header">
                  <div>
                    <h2>RBAC Status</h2>
                    <p>Access governance controls</p>
                  </div>
                </div>
                <div className="module-status-grid compact-status-grid">
                  <article><strong>Role Gate</strong><span>Enabled</span></article>
                  <article><strong>Folder Inheritance</strong><span>Enabled</span></article>
                  <article><strong>Pending Reviews</strong><span>{formatNumber(data?.dashboard.pendingAccessRequests ?? 0)}</span></article>
                </div>
              </aside>
            </section>
          ) : null}

          {activeModule === "audit" && moduleAccess.audit ? (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Audit Logs</h2>
                  <p>{formatNumber(data?.auditMeta.total ?? 0)} matching compliance events</p>
                </div>
                <button className="text-button" type="button" onClick={() => void loadDashboard(token)}>
                  <RefreshCcw aria-hidden="true" size={15} />
                  Refresh
                </button>
              </div>

              <form className="module-filter-bar" onSubmit={handleAuditSearch}>
                <label>
                  <span>Search</span>
                  <input
                    name="auditSearch"
                    value={auditQuery}
                    onChange={(event) => setAuditQuery(event.target.value)}
                    placeholder="Actor, entity, ID, reason"
                  />
                </label>
                <label>
                  <span>Action</span>
                  <select name="auditAction" value={auditAction} onChange={(event) => setAuditAction(event.target.value)}>
                    <option value="">All actions</option>
                    {auditActions.map((action) => (
                      <option value={action} key={action}>{titleCase(action)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Result</span>
                  <select name="auditSuccess" value={auditSuccess} onChange={(event) => setAuditSuccess(event.target.value)}>
                    <option value="all">All results</option>
                    <option value="true">Success</option>
                    <option value="false">Failed</option>
                  </select>
                </label>
                <button className="primary-button" type="submit">
                  <Search aria-hidden="true" size={16} />
                  Apply
                </button>
              </form>

              <div className="audit-grid" role="table" aria-label="Audit logs">
                <div className="audit-row audit-head" role="row">
                  <span role="columnheader">Time</span>
                  <span role="columnheader">Actor</span>
                  <span role="columnheader">Action</span>
                  <span role="columnheader">Entity</span>
                  <span role="columnheader">Result</span>
                  <span role="columnheader">Reason</span>
                </div>
                {(data?.auditLogs ?? []).map((log) => (
                  <div className="audit-row" role="row" key={log.id}>
                    <span role="cell">{formatDate(log.createdAt)}</span>
                    <span role="cell">
                      <strong>{log.actor?.fullName ?? "System"}</strong>
                      <small>{log.actor?.email ?? log.ipAddress ?? log.actorUserId ?? "Internal event"}</small>
                    </span>
                    <span role="cell">{titleCase(log.action)}</span>
                    <span role="cell">
                      <strong>{log.entityName ?? log.entityType ?? "System"}</strong>
                      <small>{log.entityId ?? log.id}</small>
                    </span>
                    <span role="cell">
                      <span className={`status ${log.success ? "approved" : "failed"}`}>{log.success ? "Success" : "Failed"}</span>
                    </span>
                    <span role="cell">{log.failureReason ?? "None"}</span>
                  </div>
                ))}
                {data && data.auditLogs.length === 0 ? <p className="empty-state">No audit events match the current filters.</p> : null}
              </div>
            </section>
          ) : null}

          {activeModule === "smtp" && moduleAccess.smtp ? (
            <section className="two-column smtp-layout">
              <article className="panel">
                <div className="panel-header">
                  <div>
                    <h2>SMTP Configuration</h2>
                    <p>{data?.smtpSettings?.configured ? "Production credentials configured" : "Production credentials pending"}</p>
                  </div>
                  <span className={`status ${data?.smtpSettings?.configured ? "approved" : "pending"}`}>
                    {data?.smtpSettings?.configured ? "Configured" : "Not Configured"}
                  </span>
                </div>

                <form className="upload-form" onSubmit={handleSaveSmtp}>
                  <div className="form-grid">
                    <label>
                      <span>SMTP Host</span>
                      <input value={smtpHost} onChange={(event) => setSmtpHost(event.target.value)} placeholder="smtp.company.com" />
                    </label>
                    <label>
                      <span>SMTP Port</span>
                      <input value={smtpPort} onChange={(event) => setSmtpPort(event.target.value)} inputMode="numeric" />
                    </label>
                    <label>
                      <span>Username</span>
                      <input value={smtpUsername} onChange={(event) => setSmtpUsername(event.target.value)} autoComplete="username" />
                    </label>
                    <label>
                      <span>Password</span>
                      <input
                        value={smtpPassword}
                        onChange={(event) => setSmtpPassword(event.target.value)}
                        type="password"
                        autoComplete="new-password"
                        placeholder={data?.smtpSettings?.passwordConfigured ? "Configured; leave blank to keep" : "App password"}
                      />
                    </label>
                    <label>
                      <span>From Email</span>
                      <input value={smtpFromEmail} onChange={(event) => setSmtpFromEmail(event.target.value)} type="email" />
                    </label>
                    <label>
                      <span>From Name</span>
                      <input value={smtpFromName} onChange={(event) => setSmtpFromName(event.target.value)} />
                    </label>
                    <label>
                      <span>Reply To</span>
                      <input value={smtpReplyTo} onChange={(event) => setSmtpReplyTo(event.target.value)} type="email" />
                    </label>
                  </div>

                  <div className="toggle-row">
                    <label>
                      <input type="checkbox" checked={smtpSecure} onChange={(event) => setSmtpSecure(event.target.checked)} />
                      <span>Use SSL/TLS</span>
                    </label>
                    <label>
                      <input type="checkbox" checked={smtpRequireTls} onChange={(event) => setSmtpRequireTls(event.target.checked)} />
                      <span>Require STARTTLS</span>
                    </label>
                  </div>

                  <div className="modal-actions">
                    <button className="primary-button" type="submit" disabled={smtpSaving}>
                      <Mail aria-hidden="true" size={17} />
                      {smtpSaving ? "Saving" : "Save SMTP"}
                    </button>
                  </div>
                </form>
              </article>

              <aside className="panel">
                <div className="panel-header">
                  <div>
                    <h2>SMTP Operations</h2>
                    <p>{data?.smtpSettings?.source ?? "environment"} configuration source</p>
                  </div>
                </div>

                <div className="smtp-status-grid">
                  <article><strong>Password</strong><span>{data?.smtpSettings?.passwordConfigured ? "Configured" : "Missing"}</span></article>
                  <article><strong>Last Test</strong><span>{titleCase(data?.smtpSettings?.lastTestStatus ?? "not_run")}</span></article>
                  <article><strong>Queue Failed</strong><span>{formatNumber(data?.smtpQueue?.failed ?? 0)}</span></article>
                  <article><strong>Queue Waiting</strong><span>{formatNumber(data?.smtpQueue?.waiting ?? 0)}</span></article>
                </div>

                <form className="smtp-test-form" onSubmit={handleSmtpTest}>
                  <label>
                    <span>Test Recipient</span>
                    <input value={smtpTestTo} onChange={(event) => setSmtpTestTo(event.target.value)} type="email" placeholder="it-admin@company.com" />
                  </label>
                  <button className="secondary-button" type="submit" disabled={smtpTesting || !smtpTestTo.trim()}>
                    <Mail aria-hidden="true" size={17} />
                    {smtpTesting ? "Queueing" : "Send Test"}
                  </button>
                </form>
              </aside>

              <article className="panel smtp-log-panel">
                <div className="panel-header">
                  <div>
                    <h2>Delivery Logs</h2>
                    <p>{data?.smtpDeliveryLogs.length ?? 0} latest email events</p>
                  </div>
                </div>
                <div className="smtp-log-list">
                  {(data?.smtpDeliveryLogs ?? []).map((log) => (
                    <div className="smtp-log-item" key={log.id}>
                      <div>
                        <strong>{log.subject}</strong>
                        <span>{log.recipientEmail} · {formatDate(log.createdAt)}</span>
                      </div>
                      <span className={`status ${log.status.toLowerCase()}`}>{titleCase(log.status)}</span>
                    </div>
                  ))}
                  {data && data.smtpDeliveryLogs.length === 0 ? <p className="empty-state">No email deliveries recorded.</p> : null}
                </div>
              </article>
            </section>
          ) : null}

          {activeModule === "reports" && moduleAccess.reports ? (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Reports</h2>
                  <p>{data?.reportCards.length ?? 0} management reports available</p>
                </div>
              </div>
              <div className="module-status-grid">
                {(data?.reportCards ?? []).map((report) => (
                  <article key={report.key}>
                    <strong>{report.title}</strong>
                    <span>{report.count === null ? report.summary : `${formatNumber(report.count)} rows`}</span>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activeModule === "settings" && moduleAccess.settings ? (
            <section className="two-column">
              <article className="panel">
                <div className="panel-header">
                  <div>
                    <h2>System Settings</h2>
                    <p>{data?.systemSettings?.storageDriver ?? "local"} storage driver</p>
                  </div>
                </div>
                <form className="upload-form" onSubmit={handleSaveSystemSettings}>
                  <div className="form-grid">
                    <label>
                      <span>Storage Quota GB</span>
                      <input value={settingsQuotaGb} onChange={(event) => setSettingsQuotaGb(event.target.value)} inputMode="decimal" />
                    </label>
                    <label>
                      <span>Max Upload MB</span>
                      <input value={settingsUploadMb} onChange={(event) => setSettingsUploadMb(event.target.value)} inputMode="numeric" />
                    </label>
                    <label>
                      <span>Warning Threshold %</span>
                      <input value={settingsWarning} onChange={(event) => setSettingsWarning(event.target.value)} inputMode="numeric" />
                    </label>
                    <label>
                      <span>Backup Destination</span>
                      <input value={settingsBackup} onChange={(event) => setSettingsBackup(event.target.value)} />
                    </label>
                  </div>
                  <div className="modal-actions">
                    <button className="primary-button" type="submit" disabled={settingsSaving}>
                      <Settings aria-hidden="true" size={17} />
                      {settingsSaving ? "Saving" : "Save Settings"}
                    </button>
                  </div>
                </form>
              </article>

              <article className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Notification Templates</h2>
                    <p>{data?.emailTemplates.length ?? 0} transactional templates</p>
                  </div>
                </div>
                <div className="request-list">
                  {(data?.emailTemplates ?? []).map((template) => (
                    <div className="request-item" key={template.id}>
                      <div>
                        <strong>{template.templateKey}</strong>
                        <span>{template.subject}</span>
                      </div>
                      <button className="row-text-button" type="button" onClick={() => openTemplateEditor(template)}>Edit</button>
                    </div>
                  ))}
                  {data && data.emailTemplates.length === 0 ? <p className="empty-state">No email templates configured.</p> : null}
                </div>
              </article>
            </section>
          ) : null}
        </div>
      </section>

      {fileDetailOpen && selectedFile ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel wide-modal" aria-label="File details">
            <div className="panel-header">
              <div>
                <h2>{selectedFile.originalName}</h2>
                <p>{selectedFile.folder?.pathCache ?? "Repository"}</p>
              </div>
              <button className="text-button" type="button" onClick={() => setFileDetailOpen(false)}>
                Close
              </button>
            </div>
            {fileActionMessage ? <p className="loading-banner">{fileActionMessage}</p> : null}
            <div className="module-status-grid">
              <article><strong>Classification</strong><span>{titleCase(selectedFile.classification)}</span></article>
              <article><strong>Scan</strong><span>{titleCase(selectedFile.currentVersion?.scanStatus ?? "pending")}</span></article>
              <article><strong>Size</strong><span>{selectedFile.currentVersion ? formatBytes(Number(selectedFile.currentVersion.sizeBytes)) : "0 B"}</span></article>
            </div>
            <div className="request-list version-list">
              {(selectedFile.versions ?? []).map((version) => (
                <div className="request-item" key={version.id}>
                  <div>
                    <strong>Version {version.versionNumber}</strong>
                    <span>{formatBytes(Number(version.sizeBytes))} · {titleCase(version.scanStatus)} · {formatDate(version.uploadedAt)}</span>
                  </div>
                  <button
                    className="row-text-button"
                    type="button"
                    disabled={selectedFile.currentVersion?.id === version.id}
                    onClick={() => void handleRestoreVersion(version.id)}
                  >
                    Restore
                  </button>
                </div>
              ))}
              {selectedFile.versions?.length === 0 ? <p className="empty-state">No version history available.</p> : null}
            </div>
          </section>
        </div>
      ) : null}

      {templateEditing ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel wide-modal" aria-label="Edit email template">
            <div className="panel-header">
              <div>
                <h2>Edit Template</h2>
                <p>{templateEditing.templateKey}</p>
              </div>
              <button className="text-button" type="button" onClick={() => setTemplateEditing(null)}>
                Close
              </button>
            </div>
            <form className="upload-form" onSubmit={handleSaveTemplate}>
              <label>
                <span>Subject</span>
                <input value={templateSubject} onChange={(event) => setTemplateSubject(event.target.value)} />
              </label>
              <label>
                <span>Text Body</span>
                <textarea value={templateTextBody} onChange={(event) => setTemplateTextBody(event.target.value)} rows={5} />
              </label>
              <label>
                <span>HTML Body</span>
                <textarea value={templateHtmlBody} onChange={(event) => setTemplateHtmlBody(event.target.value)} rows={6} />
              </label>
              <div className="toggle-row">
                <label>
                  <input type="checkbox" checked={templateEnabled} onChange={(event) => setTemplateEnabled(event.target.checked)} />
                  <span>Enabled</span>
                </label>
              </div>
              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={() => setTemplateEditing(null)}>Cancel</button>
                <button className="primary-button" type="submit" disabled={templateSaving}>
                  <Mail aria-hidden="true" size={17} />
                  {templateSaving ? "Saving" : "Save Template"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {folderModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" aria-label={editingFolder ? "Rename folder" : "Create folder"}>
            <div className="panel-header">
              <div>
                <h2>{editingFolder ? "Rename Folder" : "New Folder"}</h2>
                <p>{data?.folder?.folder.pathCache ?? "Repository root"}</p>
              </div>
              <button className="text-button" type="button" onClick={() => setFolderModalOpen(false)}>
                Close
              </button>
            </div>

            <form className="upload-form" onSubmit={handleSaveFolder}>
              <label>
                <span>Folder Name</span>
                <input value={folderName} onChange={(event) => setFolderName(event.target.value)} />
              </label>

              {!editingFolder && !data?.folder?.folder.id ? (
                <label>
                  <span>Department</span>
                  <select value={folderDepartmentId} onChange={(event) => setFolderDepartmentId(event.target.value)}>
                    <option value="">Unassigned</option>
                    {(data?.userOptions.departments ?? []).map((department) => (
                      <option value={department.id} key={department.id}>{department.name}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={() => setFolderModalOpen(false)}>
                  Cancel
                </button>
                <button className="primary-button" type="submit" disabled={folderSaving}>
                  <FolderPlus aria-hidden="true" size={17} />
                  {folderSaving ? "Saving" : editingFolder ? "Rename" : "Create"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {uploadOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" aria-label="Upload file">
            <div className="panel-header">
              <div>
                <h2>Upload File</h2>
                <p>{data?.folder?.folder.pathCache ?? data?.roots[0]?.name ?? "Company Repository"}</p>
              </div>
              <button className="text-button" type="button" onClick={() => setUploadOpen(false)}>
                Close
              </button>
            </div>

            <form className="upload-form" onSubmit={handleUpload}>
              <label>
                <span>File</span>
                <input
                  type="file"
                  onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                />
              </label>

              <label>
                <span>Classification</span>
                <select value={uploadClassification} onChange={(event) => setUploadClassification(event.target.value)}>
                  <option value="PUBLIC_INTERNAL">Public Internal</option>
                  <option value="INTERNAL">Internal</option>
                  <option value="CONFIDENTIAL">Confidential</option>
                  <option value="RESTRICTED">Restricted</option>
                </select>
              </label>

              <label>
                <span>Description</span>
                <textarea
                  value={uploadDescription}
                  onChange={(event) => setUploadDescription(event.target.value)}
                  rows={3}
                  placeholder="Optional business context"
                />
              </label>

              {uploadFile ? (
                <p className="upload-file-note">{uploadFile.name} · {formatBytes(uploadFile.size)}</p>
              ) : null}

              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={() => setUploadOpen(false)}>
                  Cancel
                </button>
                <button className="primary-button" type="submit" disabled={uploading}>
                  <Upload aria-hidden="true" size={17} />
                  {uploading ? "Uploading" : "Upload"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {accessModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" aria-label="Create access request">
            <div className="panel-header">
              <div>
                <h2>Access Request</h2>
                <p>{user.fullName}</p>
              </div>
              <button className="text-button" type="button" onClick={() => setAccessModalOpen(false)}>
                Close
              </button>
            </div>

            <form className="upload-form" onSubmit={handleCreateAccessRequest}>
              <label>
                <span>Resource Type</span>
                <select value={accessResourceType} onChange={(event) => setAccessResourceType(event.target.value)}>
                  <option value="FOLDER">Folder</option>
                  <option value="FILE">File</option>
                </select>
              </label>

              <label>
                <span>Resource ID</span>
                <input
                  value={accessResourceId}
                  onChange={(event) => setAccessResourceId(event.target.value)}
                  placeholder={data?.roots[0]?.id ?? "Folder or file ID"}
                />
              </label>

              <label>
                <span>Permission</span>
                <select value={accessPermissionKey} onChange={(event) => setAccessPermissionKey(event.target.value)}>
                  <option value="file.read">Read File</option>
                  <option value="file.download">Download File</option>
                  <option value="file.create">Upload File</option>
                  <option value="folder.read">Read Folder</option>
                  <option value="folder.create">Create Folder</option>
                </select>
              </label>

              <label>
                <span>Business Justification</span>
                <textarea
                  value={accessJustification}
                  onChange={(event) => setAccessJustification(event.target.value)}
                  rows={4}
                  placeholder="Project, department, client, or compliance reason"
                />
              </label>

              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={() => setAccessModalOpen(false)}>
                  Cancel
                </button>
                <button className="primary-button" type="submit" disabled={accessRequesting}>
                  <KeyRound aria-hidden="true" size={17} />
                  {accessRequesting ? "Submitting" : "Submit"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {userModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel wide-modal" aria-label={editingUser ? "Edit user" : "Create user"}>
            <div className="panel-header">
              <div>
                <h2>{editingUser ? "Edit User" : "New User"}</h2>
                <p>{editingUser ? editingUser.email : "Create employee account"}</p>
              </div>
              <button className="text-button" type="button" onClick={() => setUserModalOpen(false)}>
                Close
              </button>
            </div>

            <form className="upload-form" onSubmit={handleSaveUser}>
              <div className="form-grid">
                <label>
                  <span>Full Name</span>
                  <input value={userFullName} onChange={(event) => setUserFullName(event.target.value)} />
                </label>

                <label>
                  <span>Email</span>
                  <input
                    value={userEmail}
                    onChange={(event) => setUserEmail(event.target.value)}
                    type="email"
                    disabled={Boolean(editingUser)}
                  />
                </label>

                {!editingUser ? (
                  <label>
                    <span>Temporary Password</span>
                    <input value={userPassword} onChange={(event) => setUserPassword(event.target.value)} type="password" />
                  </label>
                ) : null}

                <label>
                  <span>Employee Code</span>
                  <input value={userEmployeeCode} onChange={(event) => setUserEmployeeCode(event.target.value)} />
                </label>

                <label>
                  <span>Country</span>
                  <input value={userCountry} onChange={(event) => setUserCountry(event.target.value)} />
                </label>

                <label>
                  <span>Department</span>
                  <select value={userDepartmentId} onChange={(event) => setUserDepartmentId(event.target.value)}>
                    <option value="">Unassigned</option>
                    {(data?.userOptions.departments ?? []).map((department) => (
                      <option value={department.id} key={department.id}>{department.name}</option>
                    ))}
                  </select>
                </label>

                {editingUser ? (
                  <label>
                    <span>Status</span>
                    <select value={userStatus} onChange={(event) => setUserStatus(event.target.value)}>
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="DEACTIVATED">Deactivated</option>
                    </select>
                  </label>
                ) : null}
              </div>

              <fieldset className="role-fieldset">
                <legend>Roles</legend>
                <div className="role-checks">
                  {(data?.userOptions.roles ?? []).map((role) => (
                    <label key={role.id}>
                      <input
                        type="checkbox"
                        checked={userRoleIds.includes(role.id)}
                        onChange={() => toggleUserRole(role.id)}
                      />
                      <span>{role.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={() => setUserModalOpen(false)}>
                  Cancel
                </button>
                <button className="primary-button" type="submit" disabled={userSaving}>
                  <Users aria-hidden="true" size={17} />
                  {userSaving ? "Saving" : "Save User"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {departmentModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel wide-modal" aria-label={editingDepartment ? "Edit department" : "Create department"}>
            <div className="panel-header">
              <div>
                <h2>{editingDepartment ? "Edit Department" : "New Department"}</h2>
                <p>{editingDepartment ? editingDepartment.code : "Master data and quota"}</p>
              </div>
              <button className="text-button" type="button" onClick={() => setDepartmentModalOpen(false)}>
                Close
              </button>
            </div>

            <form className="upload-form" onSubmit={handleSaveDepartment}>
              <div className="form-grid">
                <label>
                  <span>Name</span>
                  <input value={departmentName} onChange={(event) => setDepartmentName(event.target.value)} />
                </label>

                <label>
                  <span>Code</span>
                  <input value={departmentCode} onChange={(event) => setDepartmentCode(event.target.value)} />
                </label>

                <label>
                  <span>Quota GB</span>
                  <input
                    value={departmentQuotaGb}
                    onChange={(event) => setDepartmentQuotaGb(event.target.value)}
                    inputMode="decimal"
                    placeholder="Optional"
                  />
                </label>

                <label>
                  <span>Status</span>
                  <select value={departmentStatus} onChange={(event) => setDepartmentStatus(event.target.value)}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </label>
              </div>

              <label>
                <span>Description</span>
                <textarea
                  value={departmentDescription}
                  onChange={(event) => setDepartmentDescription(event.target.value)}
                  rows={3}
                  placeholder="Optional ownership, location, or business context"
                />
              </label>

              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={() => setDepartmentModalOpen(false)}>
                  Cancel
                </button>
                <button className="primary-button" type="submit" disabled={departmentSaving}>
                  <Building2 aria-hidden="true" size={17} />
                  {departmentSaving ? "Saving" : "Save Department"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
