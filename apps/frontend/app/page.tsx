"use client";

import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
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
  History,
  KeyRound,
  LayoutGrid,
  List,
  LockKeyhole,
  LogOut,
  Mail,
  MoreHorizontal,
  Pencil,
  RefreshCcw,
  Search,
  ServerCog,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  SortAsc,
  Star,
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
type RepositoryViewMode = "list" | "grid";

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
    id?: string;
    fullName: string;
    email: string;
  };
  department?: {
    id?: string;
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
    department?: {
      id?: string;
      name: string;
      code: string;
    } | null;
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

type RepositoryFilters = {
  classification: string;
  scanStatus: string;
  extension: string;
};

type RepositorySort = "name-asc" | "updated-desc" | "size-desc" | "classification-asc";

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

const supportedUploadExtensions = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "csv",
  "ppt",
  "pptx",
  "txt",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "zip",
  "json",
  "sql"
];

const uploadAcceptAttribute = supportedUploadExtensions.map((extension) => `.${extension}`).join(",");
const supportedUploadExtensionSet = new Set(supportedUploadExtensions);

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

function displayError(caught: unknown) {
  if (caught instanceof Error && caught.message === "Failed to fetch") {
    return "Unable to reach the API service. Please check that the backend is running on port 4000.";
  }

  return caught instanceof Error ? caught.message : "Unable to load dashboard data";
}

function decodeJwtPayload(token: string) {
  const [, payload] = token.split(".");

  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

    return JSON.parse(window.atob(padded)) as { exp?: number };
  } catch {
    return null;
  }
}

function isTokenExpired(token: string, graceSeconds = 30) {
  const payload = decodeJwtPayload(token);

  if (!payload?.exp) {
    return true;
  }

  return payload.exp * 1000 <= Date.now() + graceSeconds * 1000;
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

function fileExtension(fileName: string) {
  const index = fileName.lastIndexOf(".");

  return index > -1 ? fileName.slice(index + 1).toUpperCase() : "FILE";
}

function fileThumbnail(fileName: string) {
  const extension = fileExtension(fileName).toLowerCase();
  const thumbnails: Record<string, string> = {
    doc: "word.png",
    docx: "word.png",
    xls: "excel.png",
    xlsx: "excel.png",
    csv: "csv.png",
    ppt: "ppt.png",
    pptx: "ppt.png",
    pdf: "pdf.png",
    png: "image.png",
    jpg: "image.png",
    jpeg: "image.png",
    gif: "image.png",
    webp: "image.png",
    mp3: "audio.png",
    wav: "audio.png",
    mp4: "video.png",
    mov: "video.png",
    zip: "zip.png",
    rar: "zip.png",
    json: "json.png",
    sql: "sql.png",
    txt: "text.png"
  };

  return `/fmcc-thumbnails/${thumbnails[extension] ?? "unknow_file.png"}`;
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
  const headers = new Headers(init.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers
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
  const [repositoryDepartmentId, setRepositoryDepartmentId] = useState("");
  const [repositorySort, setRepositorySort] = useState<RepositorySort>("updated-desc");
  const [repositoryViewMode, setRepositoryViewMode] = useState<RepositoryViewMode>("list");
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
  const [repositoryDragActive, setRepositoryDragActive] = useState(false);
  const [repositoryMenuId, setRepositoryMenuId] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<RepositoryFile | null>(null);
  const [fileDetailOpen, setFileDetailOpen] = useState(false);
  const [fileActionMessage, setFileActionMessage] = useState<string | null>(null);
  const [fileOwnerUserId, setFileOwnerUserId] = useState("");
  const [fileOwnerSaving, setFileOwnerSaving] = useState(false);
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
  const [pendingDeleteFolder, setPendingDeleteFolder] = useState<FolderSummary | FolderDetail["folder"] | null>(null);
  const [folderDeleting, setFolderDeleting] = useState(false);
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
  const [viewingUser, setViewingUser] = useState<ManagedUser | null>(null);
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
  const [userDeletingId, setUserDeletingId] = useState<string | null>(null);
  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<ManagedDepartment | null>(null);
  const [viewingDepartment, setViewingDepartment] = useState<ManagedDepartment | null>(null);
  const [departmentName, setDepartmentName] = useState("");
  const [departmentCode, setDepartmentCode] = useState("");
  const [departmentDescription, setDepartmentDescription] = useState("");
  const [departmentQuotaGb, setDepartmentQuotaGb] = useState("");
  const [departmentStatus, setDepartmentStatus] = useState("ACTIVE");
  const [departmentSaving, setDepartmentSaving] = useState(false);
  const [departmentMessage, setDepartmentMessage] = useState<string | null>(null);
  const [departmentStatusUpdatingId, setDepartmentStatusUpdatingId] = useState<string | null>(null);
  const [departmentDeletingId, setDepartmentDeletingId] = useState<string | null>(null);
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

  function clearSession(message?: string) {
    window.localStorage.removeItem("filerepo.token");
    window.localStorage.removeItem("filerepo.user");
    setToken(null);
    setUser(null);
    setData(null);
    setLoading(false);
    setAuthLoading(false);

    if (message) {
      setError(message);
    }
  }

  useEffect(() => {
    const savedToken = window.localStorage.getItem("filerepo.token");
    const savedUser = window.localStorage.getItem("filerepo.user");

    if (!savedToken || !savedUser) {
      return;
    }

    if (isTokenExpired(savedToken)) {
      clearSession("Session expired. Please sign in again.");
      return;
    }

    try {
      setUser(JSON.parse(savedUser) as LoginResponse["user"]);
      setToken(savedToken);
    } catch {
      clearSession("Saved session could not be restored. Please sign in again.");
    }
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    if (isTokenExpired(token)) {
      clearSession("Session expired. Please sign in again.");
      return;
    }

    void loadDashboard(token);
  }, [token]);

  useEffect(() => {
    if (!token || !data) {
      return;
    }

    void loadDashboard(token, searchQuery, activeFolderId, undefined, undefined, activeModule);
  }, [activeModule]);

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

  const currentFolderDepartment = data?.folder?.folder.department ?? null;
  const repositoryDepartmentOptions = data?.departments.length
    ? data.departments.map((department) => ({ id: department.id, name: department.name, code: department.code }))
    : data?.userOptions.departments ?? [];
  const currentFolderDepartmentName = currentFolderDepartment
    ? `${currentFolderDepartment.name} (${currentFolderDepartment.code})`
    : "Company-wide";
  const selectedRepositoryDepartment = repositoryDepartmentId
    ? repositoryDepartmentOptions.find((department) => department.id === repositoryDepartmentId) ?? null
    : null;
  const selectedRepositoryDepartmentLabel = selectedRepositoryDepartment
    ? `${selectedRepositoryDepartment.name} (${selectedRepositoryDepartment.code})`
    : "All departments";

  const repositoryFolders = useMemo(() => {
    return [...(data?.folder?.children ?? [])].sort((left, right) => left.name.localeCompare(right.name));
  }, [data?.folder?.children]);

  const repositoryFiles = useMemo(() => {
    const files = [...(data?.files ?? [])];

    return files.sort((left, right) => {
      if (repositorySort === "name-asc") {
        return left.originalName.localeCompare(right.originalName);
      }

      if (repositorySort === "size-desc") {
        return Number(right.currentVersion?.sizeBytes ?? 0) - Number(left.currentVersion?.sizeBytes ?? 0);
      }

      if (repositorySort === "classification-asc") {
        return left.classification.localeCompare(right.classification) || left.originalName.localeCompare(right.originalName);
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
  }, [data?.files, repositorySort]);
  const visibleRepositoryFolders = useMemo(() => {
    if (!repositoryDepartmentId) {
      return repositoryFolders;
    }

    return repositoryFolders.filter((folder) => folder.departmentId === repositoryDepartmentId);
  }, [repositoryDepartmentId, repositoryFolders]);
  const visibleRepositoryFiles = useMemo(() => {
    if (!repositoryDepartmentId) {
      return repositoryFiles;
    }

    return repositoryFiles.filter((file) => file.department?.id === repositoryDepartmentId);
  }, [repositoryDepartmentId, repositoryFiles]);

  const maxUploadBytes = data?.systemSettings?.maxUploadBytes ?? 262_144_000;
  const uploadPolicyText = `Max ${formatBytes(maxUploadBytes)} per file · ${supportedUploadExtensions.join(", ").toUpperCase()}`;

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
    filters: AuditFilters = { q: auditQuery, action: auditAction, success: auditSuccess },
    repositoryFilters: RepositoryFilters = {
      classification: searchClassification,
      scanStatus: searchScanStatus,
      extension: searchExtension
    },
    moduleContext: ModuleId = activeModule
  ) {
    if (isTokenExpired(activeToken)) {
      clearSession("Session expired. Please sign in again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fileParams = new URLSearchParams({ pageSize: "100" });
      if (query.trim()) {
        fileParams.set("q", query.trim());
      }
      if (repositoryFilters.classification) {
        fileParams.set("classification", repositoryFilters.classification);
      }
      if (repositoryFilters.scanStatus) {
        fileParams.set("scanStatus", repositoryFilters.scanStatus);
      }
      if (repositoryFilters.extension.trim()) {
        fileParams.set("extension", repositoryFilters.extension.trim());
      }

      const shouldLoadDashboard = moduleContext === "dashboard";
      const shouldLoadHealth = moduleContext === "dashboard" || moduleContext === "health";
      const shouldLoadAccess = moduleContext === "dashboard" || moduleContext === "access";
      const shouldLoadUsers = moduleContext === "repository" || moduleContext === "users";
      const shouldLoadDepartmentOptions = moduleContext === "repository" || moduleContext === "users";
      const shouldLoadDepartments = moduleContext === "repository" || moduleContext === "departments" || moduleContext === "users";
      const shouldLoadAudit = moduleContext === "audit";
      const shouldLoadSmtp = moduleContext === "smtp";
      const shouldLoadRoles = moduleContext === "roles";
      const shouldLoadReports = moduleContext === "reports";
      const shouldLoadRecycle = moduleContext === "recycle";
      const shouldLoadSettings = moduleContext === "settings";

      const dashboardRequest = shouldLoadDashboard ? apiRequest<Dashboard>("/admin/dashboard", activeToken).catch((caught) => {
        if (caught instanceof ApiError && caught.status === 403) {
          return emptyDashboard;
        }

        throw caught;
      }) : Promise.resolve(data?.dashboard ?? emptyDashboard);

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
        shouldLoadHealth ? apiRequest<HealthResponse>("/health") : Promise.resolve(data?.health ?? { status: "unknown", checks: [] }),
        apiRequest<{ data: FolderSummary[] }>("/folders", activeToken),
        apiRequest<{ data: RepositoryFile[] }>(`/files?${fileParams.toString()}`, activeToken),
        shouldLoadAccess ? apiRequest<{ data: AccessRequest[] }>("/access-requests/mine?pageSize=5", activeToken) : Promise.resolve({ data: data?.myAccessRequests ?? [] }),
        canApproveAccess && shouldLoadAccess
          ? apiRequest<{ data: AccessRequest[] }>("/access-requests?status=PENDING&pageSize=5", activeToken)
          : Promise.resolve({ data: data?.approvalRequests ?? [] }),
        canReadUsers && shouldLoadUsers ? apiRequest<{ data: ManagedUser[] }>("/users?pageSize=100", activeToken) : Promise.resolve({ data: data?.managedUsers ?? [] }),
        canReadUsers && shouldLoadDepartmentOptions ? apiRequest<UserOptions>("/users/options", activeToken) : Promise.resolve(data?.userOptions ?? emptyUserOptions),
        canManageDepartments && shouldLoadDepartments ? apiRequest<{ data: ManagedDepartment[] }>("/departments?pageSize=8", activeToken) : Promise.resolve({ data: data?.departments ?? [] }),
        canApproveAccess && shouldLoadAudit
          ? apiRequest<AuditLogResponse>(auditPath(filters), activeToken)
          : Promise.resolve({ data: data?.auditLogs ?? [], meta: data?.auditMeta ?? { page: 1, pageSize: 20, total: 0, pageCount: 1 } }),
        canWriteUsers && shouldLoadSmtp ? apiRequest<SmtpSettings>("/settings/smtp", activeToken) : Promise.resolve(data?.smtpSettings ?? null),
        canWriteUsers && shouldLoadSmtp ? apiRequest<EmailQueueCounts>("/settings/smtp/queue", activeToken) : Promise.resolve(data?.smtpQueue ?? null),
        canWriteUsers && shouldLoadSmtp
          ? apiRequest<{ data: EmailDeliveryLog[] }>("/settings/smtp/delivery-logs", activeToken)
          : Promise.resolve({ data: data?.smtpDeliveryLogs ?? [] }),
        canWriteUsers && shouldLoadRoles ? apiRequest<{ data: RoleSummary[] }>("/roles", activeToken) : Promise.resolve({ data: data?.roles ?? [] }),
        canWriteUsers && shouldLoadRoles ? apiRequest<{ data: PermissionSummary[] }>("/permissions", activeToken) : Promise.resolve({ data: data?.permissions ?? [] }),
        canApproveAccess && shouldLoadReports ? loadReportCards(activeToken) : Promise.resolve(data?.reportCards ?? []),
        canWriteUsers && shouldLoadRecycle ? apiRequest<{ data: RepositoryFile[] }>("/files/recycle-bin", activeToken) : Promise.resolve({ data: data?.deletedFiles ?? [] }),
        canWriteUsers && shouldLoadRecycle ? apiRequest<{ data: FolderSummary[] }>("/folders/recycle-bin", activeToken) : Promise.resolve({ data: data?.deletedFolders ?? [] }),
        canWriteUsers && shouldLoadSettings ? apiRequest<SystemSettings>("/settings/system", activeToken) : Promise.resolve(data?.systemSettings ?? null),
        canWriteUsers && shouldLoadSettings ? apiRequest<{ data: EmailTemplate[] }>("/settings/email-templates", activeToken) : Promise.resolve({ data: data?.emailTemplates ?? [] })
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
        clearSession("Session expired. Please sign in again.");
        return;
      }

      const message = displayError(caught);
      if (message.startsWith("Unable to reach the API service") && data) {
        setError(null);
        setUploadMessage("Could not refresh right now. Showing the last loaded repository data.");
        return;
      }

      setError(message);
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
    clearSession();
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("repositorySearch") ?? "");
    const repositoryFilters = {
      classification: searchClassification,
      scanStatus: searchScanStatus,
      extension: searchExtension
    };

    setSearchQuery(query);
    activateModule("repository");

    if (token) {
      void loadDashboard(token, query, activeFolderId, undefined, repositoryFilters, "repository");
    }
  }

  function handleRepositoryClear() {
    const emptyRepositoryFilters = { classification: "", scanStatus: "", extension: "" };

    setSearchQuery("");
    setSearchClassification("");
    setSearchScanStatus("");
    setSearchExtension("");
    setRepositoryDepartmentId("");

    if (token) {
      void loadDashboard(token, "", activeFolderId, undefined, emptyRepositoryFilters, "repository");
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
      void loadDashboard(token, searchQuery, activeFolderId, filters, undefined, "audit");
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

  function selectUploadFile(file: File | null) {
    if (!file) {
      setUploadFile(null);
      return false;
    }

    const extension = fileExtension(file.name).toLowerCase();

    if (!supportedUploadExtensionSet.has(extension)) {
      setUploadFile(null);
      setUploadMessage(`Unsupported file type .${extension}. Allowed types: ${supportedUploadExtensions.join(", ")}.`);
      return false;
    }

    if (file.size > maxUploadBytes) {
      setUploadFile(null);
      setUploadMessage(`${file.name} is ${formatBytes(file.size)}. The current upload limit is ${formatBytes(maxUploadBytes)}.`);
      return false;
    }

    setUploadFile(file);
    setUploadMessage(null);
    return true;
  }

  function handleUploadInputChange(event: ChangeEvent<HTMLInputElement>) {
    selectUploadFile(event.target.files?.[0] ?? null);
  }

  function handleRepositoryDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setRepositoryDragActive(true);
  }

  function handleRepositoryDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setRepositoryDragActive(false);
    }
  }

  function handleRepositoryDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setRepositoryDragActive(false);

    const file = event.dataTransfer.files?.[0] ?? null;
    const selected = selectUploadFile(file);

    if (event.dataTransfer.files.length > 1 && selected) {
      setUploadMessage("Multiple files were dropped. The first file has been selected for upload.");
    }

    if (selected) {
      setUploadOpen(true);
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("Please sign in before uploading.");
      return;
    }

    const folderId = data?.folder?.folder.id ?? activeFolderId ?? data?.roots?.[0]?.id;

    if (!folderId) {
      setError("No destination folder is available.");
      return;
    }

    if (!uploadFile) {
      setUploadMessage("Choose a file before uploading.");
      return;
    }

    if (!selectUploadFile(uploadFile)) {
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
      setFileOwnerUserId(detail.createdBy?.id ?? "");
      setFileActionMessage(null);
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

  async function handleUpdateFileOwner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token || !selectedFile || !fileOwnerUserId) {
      return;
    }

    setFileOwnerSaving(true);
    setFileActionMessage(null);
    setError(null);

    try {
      const updated = await apiRequest<RepositoryFile>(`/files/${selectedFile.id}/owner`, token, {
        method: "PATCH",
        body: JSON.stringify({ ownerUserId: fileOwnerUserId })
      });
      setSelectedFile(updated);
      setFileOwnerUserId(updated.createdBy?.id ?? "");
      setFileActionMessage("Owner allocation updated.");
      await loadDashboard(token, searchQuery, activeFolderId, undefined, undefined, "repository");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update file owner");
    } finally {
      setFileOwnerSaving(false);
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

  async function handleDeleteFolder(folder: FolderSummary | FolderDetail["folder"]) {
    setPendingDeleteFolder(folder);
    setError(null);
  }

  async function confirmDeleteFolder() {
    if (!token || !pendingDeleteFolder) {
      return;
    }

    setFolderDeleting(true);
    try {
      await apiRequest(`/folders/${pendingDeleteFolder.id}`, token, { method: "DELETE" });
      const nextFolderId = pendingDeleteFolder.parentId ?? data?.roots.find((root) => root.id !== pendingDeleteFolder.id)?.id ?? null;
      setFolderMessage("Folder moved to recycle bin.");
      setPendingDeleteFolder(null);
      await loadDashboard(token, searchQuery, nextFolderId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete folder");
    } finally {
      setFolderDeleting(false);
    }
  }

  async function handleRestoreRecycleFile(fileId: string) {
    if (!token) {
      return;
    }

    try {
      await apiRequest(`/files/${fileId}/restore`, token, { method: "PATCH" });
      setFolderMessage("File restored.");
      await loadDashboard(token, searchQuery, activeFolderId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to restore file");
    }
  }

  async function handlePermanentDeleteFile(fileId: string) {
    if (!token) {
      return;
    }

    try {
      await apiRequest(`/files/${fileId}/permanent`, token, { method: "DELETE" });
      setFolderMessage("File permanently deleted.");
      await loadDashboard(token, searchQuery, activeFolderId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to permanently delete file");
    }
  }

  async function handleRestoreRecycleFolder(folderId: string) {
    if (!token) {
      return;
    }

    try {
      await apiRequest(`/folders/${folderId}/restore`, token, { method: "PATCH" });
      setFolderMessage("Folder restored.");
      await loadDashboard(token, searchQuery, activeFolderId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to restore folder");
    }
  }

  async function handlePermanentDeleteFolder(folderId: string) {
    if (!token) {
      return;
    }

    try {
      await apiRequest(`/folders/${folderId}/permanent`, token, { method: "DELETE" });
      setFolderMessage("Folder permanently deleted.");
      await loadDashboard(token, searchQuery, activeFolderId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to permanently delete folder");
    }
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
    setFolderDepartmentId(data?.folder?.folder.departmentId ?? data?.userOptions.departments?.[0]?.id ?? "");
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
    const defaultRole = data?.userOptions.roles?.find((role) => role.code === "EMPLOYEE") ?? data?.userOptions.roles?.[0];
    setEditingUser(null);
    setUserFullName("");
    setUserEmail("");
    setUserPassword("");
    setUserEmployeeCode("");
    setUserCountry("India");
    setUserDepartmentId(data?.userOptions.departments?.[0]?.id ?? "");
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

  async function handleDeleteUser(target: ManagedUser) {
    if (!token) {
      setError("Please sign in before managing users.");
      return;
    }

    if (target.id === user?.id) {
      setUserMessage("You cannot delete your own signed-in account.");
      return;
    }

    const confirmed = window.confirm(`Delete user ${target.fullName}? The account will be deactivated and active sessions revoked.`);
    if (!confirmed) {
      return;
    }

    setUserDeletingId(target.id);
    setUserMessage(null);
    setError(null);

    try {
      await apiRequest<ManagedUser>(`/users/${target.id}`, token, { method: "DELETE" });
      await loadDashboard(token, searchQuery, activeFolderId, undefined, undefined, "users");
      setUserMessage("User deleted.");
    } catch (caught) {
      setUserMessage(caught instanceof Error ? caught.message : "Unable to delete user");
    } finally {
      setUserDeletingId(null);
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

  async function handleDeleteDepartment(target: ManagedDepartment) {
    if (!token) {
      setError("Please sign in before managing departments.");
      return;
    }

    const usageCount = target.userCount + target.folderCount + target.fileCount;
    if (usageCount > 0) {
      setDepartmentMessage("Department is in use. Disable it instead of deleting.");
      return;
    }

    const confirmed = window.confirm(`Delete department ${target.name}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setDepartmentDeletingId(target.id);
    setDepartmentMessage(null);
    setError(null);

    try {
      await apiRequest(`/departments/${target.id}`, token, { method: "DELETE" });
      await loadDashboard(token, searchQuery, activeFolderId, undefined, undefined, "departments");
      setDepartmentMessage("Department deleted.");
    } catch (caught) {
      setDepartmentMessage(caught instanceof Error ? caught.message : "Unable to delete department");
    } finally {
      setDepartmentDeletingId(null);
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
          {activeModule !== "repository" ? (
            <section className="page-heading">
              <div>
                <p className="eyebrow">{activeModuleConfig.eyebrow}</p>
                <h1>{activeModuleConfig.name}</h1>
                <p className="page-copy">Signed in as {user.fullName} with {user.roles.join(", ") || "assigned"} access.</p>
              </div>
              <div className="heading-actions">
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
          ) : null}

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
            <section className="repository-module">
              <article className="panel repository-panel repository-explorer">
                <aside className="repository-explorer-nav" aria-label="Repository navigation">
                  <div className="repository-nav-title">
                    <FolderTree aria-hidden="true" size={19} />
                    <strong>{data?.roots?.[0]?.name ?? "All Files"}</strong>
                  </div>
                  <div className="repository-nav-tree">
                    {(data?.roots ?? []).map((root) => (
                      <button
                        className={activeFolderId === root.id ? "active" : ""}
                        type="button"
                        key={root.id}
                        onClick={() => void handleOpenFolder(root.id)}
                      >
                        <FolderTree aria-hidden="true" size={16} />
                        <span>{root.name}</span>
                      </button>
                    ))}
                    {repositoryFolders.map((folder) => (
                      <button type="button" key={folder.id} onClick={() => void handleOpenFolder(folder.id)}>
                        <span className="repository-nav-indent" />
                        <FolderTree aria-hidden="true" size={15} />
                        <span>{folder.name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="repository-nav-links">
                    <button type="button" onClick={() => token && void loadDashboard(token, "", activeFolderId)}>
                      <RefreshCcw aria-hidden="true" size={16} />
                      Recent
                    </button>
                    <button type="button" onClick={() => setAccessModalOpen(true)}>
                      <Star aria-hidden="true" size={16} />
                      Access
                    </button>
                    <button type="button" onClick={() => activateModule("recycle")}>
                      <ArchiveRestore aria-hidden="true" size={16} />
                      Trash
                    </button>
                  </div>
                  <div className="repository-storage">
                    <span>Visible storage</span>
                    <strong>{formatBytes(repositoryFiles.reduce((total, file) => total + Number(file.currentVersion?.sizeBytes ?? 0), 0))}</strong>
                  </div>
                </aside>

                <div className="repository-explorer-main">
                  <div className="repository-workbench">
                    <div className="repository-location">
                      <button className="repository-back-link" type="button" onClick={() => activateModule("dashboard")}>
                        <ArrowLeft aria-hidden="true" size={15} />
                        Back to dashboard
                      </button>
                      <h2>Company Repository</h2>
                      <div className="breadcrumb-list repository-breadcrumbs" aria-label="Folder breadcrumbs">
                        {(data?.folder?.breadcrumbs ?? []).map((crumb) => (
                          <button type="button" key={crumb.id} onClick={() => void handleOpenFolder(crumb.id)}>
                            {crumb.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="repository-actions">
                      <button className="secondary-button" type="button" onClick={openCreateFolder}>
                        <FolderPlus aria-hidden="true" size={16} />
                        New Folder
                      </button>
                      <button className="primary-button" type="button" onClick={() => setUploadOpen(true)}>
                        <Upload aria-hidden="true" size={16} />
                        New
                      </button>
                      <details className="repository-action-menu">
                        <summary>
                          Options
                          <MoreHorizontal aria-hidden="true" size={16} />
                        </summary>
                        <div>
                          <button
                            type="button"
                            disabled={!data?.folder?.folder.parentId}
                            onClick={() => void handleOpenFolder(data?.folder?.folder.parentId ?? null)}
                          >
                            <ArrowLeft aria-hidden="true" size={15} />
                            Up
                          </button>
                          {data?.folder?.folder ? (
                            <button type="button" onClick={() => openEditFolder(data.folder!.folder)}>
                              <Pencil aria-hidden="true" size={15} />
                              Rename folder
                            </button>
                          ) : null}
                          {data?.folder?.folder ? (
                            <button className="danger" type="button" onClick={() => void handleDeleteFolder(data.folder!.folder)}>
                              <XCircle aria-hidden="true" size={15} />
                              Delete folder
                            </button>
                          ) : null}
                        </div>
                      </details>
                    </div>
                  </div>

                  <div className="repository-folder-strip" aria-label="Folders">
                    {visibleRepositoryFolders.map((folder) => (
                      <article className="repository-folder-tile" key={folder.id}>
                        <button type="button" onClick={() => void handleOpenFolder(folder.id)}>
                          <span className="repository-folder-icon"><FolderTree aria-hidden="true" size={24} /></span>
                          <span>
                            <strong>{folder.name}</strong>
                            <small>{folder.childFolderCount} folders · {folder.fileCount} files</small>
                            <span className="department-chip compact">
                              {folder.department?.code ?? "NO DEPT"}
                            </span>
                          </span>
                        </button>
                        <details
                          className="repository-more-menu"
                          open={repositoryMenuId === `folder:${folder.id}`}
                          onToggle={(event) => {
                            if (event.currentTarget.open) {
                              setRepositoryMenuId(`folder:${folder.id}`);
                            } else if (repositoryMenuId === `folder:${folder.id}`) {
                              setRepositoryMenuId(null);
                            }
                          }}
                        >
                          <summary title={`More actions for ${folder.name}`}>
                            <MoreHorizontal aria-hidden="true" size={17} />
                          </summary>
                          <div>
                            <button type="button" onClick={() => { setRepositoryMenuId(null); void handleOpenFolder(folder.id); }}>
                              <FolderTree aria-hidden="true" size={15} />
                              Open
                            </button>
                            <button type="button" onClick={() => { setRepositoryMenuId(null); openEditFolder(folder); }}>
                              <Pencil aria-hidden="true" size={15} />
                              Rename
                            </button>
                            <button className="danger" type="button" onClick={() => { setRepositoryMenuId(null); void handleDeleteFolder(folder); }}>
                              <XCircle aria-hidden="true" size={15} />
                              Delete
                            </button>
                          </div>
                        </details>
                      </article>
                    ))}
                  </div>

                  <form className="repository-simple-search" onSubmit={handleSearch}>
                    <label title="Search repository files">
                      <Search aria-hidden="true" size={18} />
                      <input
                        name="repositorySearch"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search files and folders"
                      />
                    </label>
                    <button className="primary-button" type="submit">
                      <Search aria-hidden="true" size={16} />
                      Search
                    </button>
                  </form>

                  <div className="repository-simple-toolbar" aria-label="Repository actions">
                    <span>{visibleRepositoryFolders.length} folders</span>
                    <span>{visibleRepositoryFiles.length} files</span>
                    <label title="Filter by department">
                      <Building2 aria-hidden="true" size={15} />
                      <select value={repositoryDepartmentId} onChange={(event) => setRepositoryDepartmentId(event.target.value)}>
                        <option value="">All departments</option>
                        {(repositoryDepartmentOptions ?? []).map((department) => (
                          <option value={department.id} key={department.id}>{department.name}</option>
                        ))}
                      </select>
                    </label>
                    <label title="Sort files">
                      <SortAsc aria-hidden="true" size={15} />
                      <select value={repositorySort} onChange={(event) => setRepositorySort(event.target.value as RepositorySort)}>
                        <option value="updated-desc">Latest first</option>
                        <option value="name-asc">Name A-Z</option>
                        <option value="size-desc">Largest first</option>
                        <option value="classification-asc">Classification</option>
                      </select>
                    </label>
                    <button className="row-text-button" type="button" onClick={handleRepositoryClear}>
                      <XCircle aria-hidden="true" size={15} />
                      Clear
                    </button>
                    <div className="repository-view-toggle" aria-label="Repository view mode">
                      <button
                        className={repositoryViewMode === "list" ? "active" : ""}
                        type="button"
                        title="List view"
                        onClick={() => setRepositoryViewMode("list")}
                      >
                        <List aria-hidden="true" size={15} />
                      </button>
                      <button
                        className={repositoryViewMode === "grid" ? "active" : ""}
                        type="button"
                        title="Grid view"
                        onClick={() => setRepositoryViewMode("grid")}
                      >
                        <LayoutGrid aria-hidden="true" size={15} />
                      </button>
                    </div>
                    <details className="repository-advanced">
                      <summary><SlidersHorizontal aria-hidden="true" size={15} /> More filters</summary>
                      <div className="repository-advanced-grid">
                        <label>
                          <span>Classification</span>
                          <select value={searchClassification} onChange={(event) => setSearchClassification(event.target.value)}>
                            <option value="">Any classification</option>
                            <option value="PUBLIC_INTERNAL">Public Internal</option>
                            <option value="INTERNAL">Internal</option>
                            <option value="CONFIDENTIAL">Confidential</option>
                            <option value="RESTRICTED">Restricted</option>
                          </select>
                        </label>
                        <label>
                          <span>Scan status</span>
                          <select value={searchScanStatus} onChange={(event) => setSearchScanStatus(event.target.value)}>
                            <option value="">Any scan status</option>
                            <option value="PENDING">Pending</option>
                            <option value="SCANNING">Scanning</option>
                            <option value="CLEAN">Clean</option>
                            <option value="INFECTED">Infected</option>
                            <option value="FAILED">Failed</option>
                          </select>
                        </label>
                        <label>
                          <span>Extension</span>
                          <input value={searchExtension} onChange={(event) => setSearchExtension(event.target.value)} placeholder="pdf" />
                        </label>
                      </div>
                    </details>
                  </div>

                  <div className={`repository-table-head${repositoryViewMode === "grid" ? " is-grid-hidden" : ""}`} aria-hidden="true">
                    <span>Name</span>
                    <span>Size / Type</span>
                    <span>Owner / Dept</span>
                    <span />
                  </div>

                  <div className="repository-simple-list" data-view-mode={repositoryViewMode} aria-label="Repository items">
                    {visibleRepositoryFiles.map((file) => (
                      <article className="repository-simple-item" key={file.id}>
                        <button className="repository-simple-main" type="button" onClick={() => void handleOpenFile(file)}>
                          <span className="repository-file-thumb">
                            <img src={fileThumbnail(file.originalName)} alt="" />
                          </span>
                          <span>
                            <strong>{file.originalName}</strong>
                            <small>
                              {fileExtension(file.originalName)} · {formatDate(file.updatedAt)}
                            </small>
                            <span className="department-chip compact">
                              {file.department?.code ?? "NO DEPT"}
                            </span>
                          </span>
                        </button>
                        <span className="repository-simple-meta">{file.currentVersion ? formatBytes(Number(file.currentVersion.sizeBytes)) : "0 B"}</span>
                        <span className="repository-simple-meta">
                          {file.createdBy?.fullName ?? "System"}
                          <small>{file.department?.name ?? "Unassigned"}</small>
                        </span>
                        <details
                          className="repository-more-menu"
                          open={repositoryMenuId === `file:${file.id}`}
                          onToggle={(event) => {
                            if (event.currentTarget.open) {
                              setRepositoryMenuId(`file:${file.id}`);
                            } else if (repositoryMenuId === `file:${file.id}`) {
                              setRepositoryMenuId(null);
                            }
                          }}
                        >
                          <summary title={`More actions for ${file.originalName}`}>
                            <MoreHorizontal aria-hidden="true" size={17} />
                          </summary>
                          <div>
                            <button type="button" onClick={() => { setRepositoryMenuId(null); void handleOpenFile(file); }}>
                              <FileText aria-hidden="true" size={15} />
                              View
                            </button>
                            <button type="button" disabled={file.currentVersion?.scanStatus !== "CLEAN"} onClick={() => { setRepositoryMenuId(null); void handlePreviewFile(file); }}>
                              <Search aria-hidden="true" size={15} />
                              Preview
                            </button>
                            <button type="button" disabled={file.currentVersion?.scanStatus !== "CLEAN" || downloadingFileId === file.id} onClick={() => { setRepositoryMenuId(null); void handleDownload(file); }}>
                              <Download aria-hidden="true" size={15} />
                              Download
                            </button>
                            <button className="danger" type="button" onClick={() => { setRepositoryMenuId(null); void handleDeleteFile(file); }}>
                              <XCircle aria-hidden="true" size={15} />
                              Delete
                            </button>
                          </div>
                        </details>
                      </article>
                    ))}

                    {data && visibleRepositoryFiles.length === 0 ? (
                      <p className="empty-state">
                        {repositoryDepartmentId ? `No files found for ${selectedRepositoryDepartmentLabel}.` : "This folder is empty."}
                      </p>
                    ) : null}
                  </div>

                  <div
                    className={`repository-drop-zone${repositoryDragActive ? " is-active" : ""}`}
                    onDragOver={handleRepositoryDragOver}
                    onDragLeave={handleRepositoryDragLeave}
                    onDrop={handleRepositoryDrop}
                  >
                    <Upload aria-hidden="true" size={34} />
                    <strong>{repositoryDragActive ? "Drop file to upload" : "Drag and drop files here"}</strong>
                    <span>{uploadPolicyText}</span>
                    <small>
                      Files will be added into {data?.folder?.folder.name ?? "this folder"} under {currentFolderDepartmentName}.
                    </small>
                    <button className="primary-button" type="button" onClick={() => setUploadOpen(true)}>
                      Browse Files
                    </button>
                  </div>
                </div>
              </article>
            </section>
          ) : null}

          {activeModule === "recycle" && moduleAccess.recycle ? (
            <section className="two-column">
              <article className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Deleted Files</h2>
                    <p>{data?.deletedFiles?.length ?? 0} files in recycle bin</p>
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
                    <p>{data?.deletedFolders?.length ?? 0} folders in recycle bin</p>
                  </div>
                </div>
                <div className="request-list">
                  {(data?.deletedFolders ?? []).map((folder) => {
                    const hasContents = folder.childFolderCount > 0 || folder.fileCount > 0;

                    return (
                      <div className="request-item" key={folder.id}>
                        <div>
                          <strong>{folder.name}</strong>
                          <span>
                            {folder.pathCache ?? "Repository"} · {folder.childFolderCount} folders · {folder.fileCount} files
                          </span>
                          {hasContents ? (
                            <small>Permanent delete will remove this folder and all contained child folders/files.</small>
                          ) : null}
                        </div>
                        <div className="decision-actions">
                          <button className="row-text-button" type="button" onClick={() => void handleRestoreRecycleFolder(folder.id)}>Restore</button>
                          <button
                            className="row-text-button"
                            type="button"
                            title={hasContents ? "Permanently delete folder and contents" : "Permanently delete folder"}
                            onClick={() => void handlePermanentDeleteFolder(folder.id)}
                          >
                            Permanent Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
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
                  <p>{data?.myAccessRequests?.length ?? 0} recent requests</p>
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
                  <p>{canApproveAccess ? `${data?.approvalRequests?.length ?? 0} pending decisions` : "Reviewer access required"}</p>
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
                  <p>{data?.departments?.length ?? 0} departments with quota and usage</p>
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
                      <button className="row-text-button" type="button" onClick={() => setViewingDepartment(department)}>
                        View
                      </button>
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
                      <button
                        className="row-text-button danger"
                        type="button"
                        disabled={departmentDeletingId === department.id || department.userCount + department.folderCount + department.fileCount > 0}
                        title={department.userCount + department.folderCount + department.fileCount > 0 ? "Disable departments that already have users, folders, or files" : "Delete department"}
                        onClick={() => void handleDeleteDepartment(department)}
                      >
                        Delete
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
                  <p>{data?.managedUsers?.length ?? 0} recently managed users</p>
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
                      <button className="row-text-button" type="button" onClick={() => setViewingUser(managedUser)}>
                        View
                      </button>
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
                          <button
                            className="row-text-button danger"
                            type="button"
                            disabled={userDeletingId === managedUser.id || managedUser.status === "DEACTIVATED" || managedUser.id === user?.id}
                            title={managedUser.id === user?.id ? "You cannot delete your own signed-in account" : "Delete user"}
                            onClick={() => void handleDeleteUser(managedUser)}
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        null
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
                  <p>{data?.roles?.length ?? 0} roles and {data?.permissions?.length ?? 0} permissions</p>
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
                    <p>{data?.smtpDeliveryLogs?.length ?? 0} latest email events</p>
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
                  <p>{data?.reportCards?.length ?? 0} management reports available</p>
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
                  <div className="settings-policy-card" aria-label="Repository upload policy">
                    <div>
                      <strong>Repository Upload Policy</strong>
                      <span>These limits are enforced before files are sent to the server.</span>
                    </div>
                    <div className="settings-policy-grid">
                      <article>
                        <span>Max file size</span>
                        <strong>{formatBytes(maxUploadBytes)}</strong>
                      </article>
                      <article>
                        <span>Supported types</span>
                        <strong>{supportedUploadExtensions.join(", ").toUpperCase()}</strong>
                      </article>
                    </div>
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
                    <p>{data?.emailTemplates?.length ?? 0} transactional templates</p>
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
            <div className="file-viewer-actions" aria-label="File actions">
              <button
                className="primary-button"
                type="button"
                disabled={selectedFile.currentVersion?.scanStatus !== "CLEAN"}
                onClick={() => void handlePreviewFile(selectedFile)}
              >
                <Search aria-hidden="true" size={17} />
                View File
              </button>
              <button
                className="secondary-button"
                type="button"
                disabled={selectedFile.currentVersion?.scanStatus !== "CLEAN" || downloadingFileId === selectedFile.id}
                onClick={() => void handleDownload(selectedFile)}
              >
                <Download aria-hidden="true" size={17} />
                {downloadingFileId === selectedFile.id ? "Downloading" : "Download"}
              </button>
              <button className="secondary-button danger" type="button" onClick={() => void handleDeleteFile(selectedFile)}>
                <XCircle aria-hidden="true" size={17} />
                Delete
              </button>
            </div>
            <div className="module-status-grid">
              <article><strong>Classification</strong><span>{titleCase(selectedFile.classification)}</span></article>
              <article><strong>Scan</strong><span>{titleCase(selectedFile.currentVersion?.scanStatus ?? "pending")}</span></article>
              <article><strong>Size</strong><span>{selectedFile.currentVersion ? formatBytes(Number(selectedFile.currentVersion.sizeBytes)) : "0 B"}</span></article>
              <article><strong>Owner</strong><span>{selectedFile.createdBy?.fullName ?? "Unassigned"}</span></article>
            </div>
            <form className="owner-allocation-form" onSubmit={handleUpdateFileOwner}>
              <label>
                <span>Owner Allocation</span>
                <select value={fileOwnerUserId} onChange={(event) => setFileOwnerUserId(event.target.value)}>
                  <option value="">Select owner</option>
                  {selectedFile.createdBy?.id && !data?.managedUsers.some((managedUser) => managedUser.id === selectedFile.createdBy?.id) ? (
                    <option value={selectedFile.createdBy.id}>{selectedFile.createdBy.fullName}</option>
                  ) : null}
                  {(data?.managedUsers ?? []).map((managedUser) => (
                    <option value={managedUser.id} key={managedUser.id}>
                      {managedUser.fullName} · {managedUser.department?.code ?? "No Dept"}
                    </option>
                  ))}
                </select>
              </label>
              <button className="primary-button" type="submit" disabled={fileOwnerSaving || !fileOwnerUserId}>
                {fileOwnerSaving ? "Saving" : "Save Owner"}
              </button>
            </form>
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

      {pendingDeleteFolder ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" aria-label="Delete folder">
            <div className="panel-header">
              <div>
                <h2>Delete Folder</h2>
                <p>{pendingDeleteFolder.pathCache ?? pendingDeleteFolder.name}</p>
              </div>
              <button className="text-button" type="button" onClick={() => setPendingDeleteFolder(null)} disabled={folderDeleting}>
                Close
              </button>
            </div>
            <div className="delete-confirmation">
              <p>
                Move <strong>{pendingDeleteFolder.name}</strong> to the recycle bin?
              </p>
              <span>Files and child folders will not be permanently removed until they are deleted from the recycle bin.</span>
            </div>
            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={() => setPendingDeleteFolder(null)} disabled={folderDeleting}>
                Cancel
              </button>
              <button className="primary-button danger-action" type="button" onClick={() => void confirmDeleteFolder()} disabled={folderDeleting}>
                <XCircle aria-hidden="true" size={17} />
                {folderDeleting ? "Deleting" : "Move to Recycle Bin"}
              </button>
            </div>
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
                    {(repositoryDepartmentOptions ?? []).map((department) => (
                      <option value={department.id} key={department.id}>{department.name}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              {!editingFolder && data?.folder?.folder.id ? (
                <p className="upload-policy-note">
                  This folder will inherit {currentFolderDepartmentName} from the current location.
                </p>
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
                <p>{data?.folder?.folder.pathCache ?? data?.roots?.[0]?.name ?? "Company Repository"}</p>
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
                  accept={uploadAcceptAttribute}
                  onChange={handleUploadInputChange}
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
              <p className="upload-policy-note">{uploadPolicyText}</p>
              <p className="upload-policy-note">
                Owner: {user?.fullName ?? user?.email ?? "Current user"}. The uploaded file is linked to the signed-in user.
              </p>
              <p className="upload-policy-note">
                Department: {currentFolderDepartmentName}. Files inherit department from the selected folder.
              </p>

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
                  placeholder={data?.roots?.[0]?.id ?? "Folder or file ID"}
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

      {viewingUser ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel wide-modal" aria-label="User details">
            <div className="panel-header">
              <div>
                <h2>{viewingUser.fullName}</h2>
                <p>{viewingUser.email}</p>
              </div>
              <button className="text-button" type="button" onClick={() => setViewingUser(null)}>
                Close
              </button>
            </div>

            <div className="module-status-grid">
              <article><strong>Status</strong><span>{titleCase(viewingUser.status)}</span></article>
              <article><strong>Department</strong><span>{viewingUser.department?.name ?? "Unassigned"}</span></article>
              <article><strong>Employee Code</strong><span>{viewingUser.employeeCode ?? "--"}</span></article>
              <article><strong>Country</strong><span>{viewingUser.country ?? "--"}</span></article>
              <article><strong>Timezone</strong><span>{viewingUser.timezone}</span></article>
              <article><strong>Last Login</strong><span>{viewingUser.lastLoginAt ? formatDate(viewingUser.lastLoginAt) : "Never"}</span></article>
            </div>

            <div className="request-list version-list">
              {viewingUser.roles.map((role) => (
                <div className="request-item" key={role.id}>
                  <div>
                    <strong>{role.name}</strong>
                    <span>{role.code}</span>
                  </div>
                </div>
              ))}
              {viewingUser.roles.length === 0 ? <p className="empty-state">No roles assigned.</p> : null}
            </div>

            {canWriteUsers ? (
              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={() => { setViewingUser(null); openEditUser(viewingUser); }}>
                  Edit
                </button>
                <button
                  className="secondary-button danger"
                  type="button"
                  disabled={viewingUser.status === "DEACTIVATED" || viewingUser.id === user?.id}
                  onClick={() => void handleDeleteUser(viewingUser)}
                >
                  Delete
                </button>
              </div>
            ) : null}
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

      {viewingDepartment ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel wide-modal" aria-label="Department details">
            <div className="panel-header">
              <div>
                <h2>{viewingDepartment.name}</h2>
                <p>{viewingDepartment.code}</p>
              </div>
              <button className="text-button" type="button" onClick={() => setViewingDepartment(null)}>
                Close
              </button>
            </div>

            <div className="module-status-grid">
              <article><strong>Status</strong><span>{titleCase(viewingDepartment.status)}</span></article>
              <article><strong>Users</strong><span>{formatNumber(viewingDepartment.userCount)}</span></article>
              <article><strong>Folders</strong><span>{formatNumber(viewingDepartment.folderCount)}</span></article>
              <article><strong>Files</strong><span>{formatNumber(viewingDepartment.fileCount)}</span></article>
              <article><strong>Storage</strong><span>{formatBytes(Number(viewingDepartment.storageUsedBytes))}</span></article>
              <article>
                <strong>Quota</strong>
                <span>
                  {viewingDepartment.storageQuotaBytes
                    ? `${viewingDepartment.quotaUsedPercent ?? 0}% of ${formatBytes(Number(viewingDepartment.storageQuotaBytes))}`
                    : "No quota"}
                </span>
              </article>
            </div>

            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={() => { setViewingDepartment(null); openEditDepartment(viewingDepartment); }}>
                Edit
              </button>
              <button
                className="secondary-button danger"
                type="button"
                disabled={viewingDepartment.userCount + viewingDepartment.folderCount + viewingDepartment.fileCount > 0}
                onClick={() => void handleDeleteDepartment(viewingDepartment)}
              >
                Delete
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
