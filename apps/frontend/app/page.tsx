"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArchiveRestore,
  Bell,
  Building2,
  ChartNoAxesCombined,
  Database,
  Download,
  FileText,
  FolderTree,
  Gauge,
  Heart,
  History,
  KeyRound,
  LockKeyhole,
  LogOut,
  Mail,
  RefreshCcw,
  Search,
  ServerCog,
  Settings,
  ShieldCheck,
  Upload,
  Users
} from "lucide-react";

const modules = [
  { name: "Dashboard", icon: Gauge, active: true },
  { name: "Repository", icon: FolderTree },
  { name: "Departments", icon: Building2 },
  { name: "Projects", icon: FileText },
  { name: "Users", icon: Users },
  { name: "Roles & RBAC", icon: LockKeyhole },
  { name: "Audit Logs", icon: History },
  { name: "Reports", icon: ChartNoAxesCombined },
  { name: "SMTP", icon: Mail },
  { name: "System Health", icon: ServerCog },
  { name: "Settings", icon: Settings }
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
  name: string;
  department?: {
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
    sizeBytes: string;
    scanStatus: string;
    uploadedAt: string;
  } | null;
};

type FolderDetail = {
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
};

type UploadResult = RepositoryFile & {
  scanQueued?: boolean;
  scanQueueError?: string;
};

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

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
  const [searchQuery, setSearchQuery] = useState("");
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

  async function loadDashboard(activeToken: string, query = searchQuery) {
    setLoading(true);
    setError(null);

    try {
      const [dashboard, health, roots, fileSearch] = await Promise.all([
        apiRequest<Dashboard>("/admin/dashboard", activeToken),
        apiRequest<HealthResponse>("/health"),
        apiRequest<{ data: FolderSummary[] }>("/folders", activeToken),
        apiRequest<{ data: RepositoryFile[] }>(`/files?pageSize=8${query.trim() ? `&q=${encodeURIComponent(query.trim())}` : ""}`, activeToken)
      ]);

      const rootFolder = roots.data[0];
      const folder = rootFolder
        ? await apiRequest<FolderDetail>(`/folders/${rootFolder.id}`, activeToken)
        : null;

      setData({
        dashboard,
        health,
        roots: roots.data,
        folder,
        files: fileSearch.data
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

    if (token) {
      void loadDashboard(token, query);
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("Please sign in before uploading.");
      return;
    }

    const folderId = data?.roots[0]?.id;

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

      await loadDashboard(token, searchQuery);
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
            return (
              <button className={module.active ? "nav-item active" : "nav-item"} key={module.name} type="button">
                <Icon aria-hidden="true" size={18} />
                <span>{module.name}</span>
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
              <p className="eyebrow">Enterprise MVP Dashboard</p>
              <h1>Company File Repository</h1>
              <p className="page-copy">Signed in as {user.fullName} with {user.roles.join(", ") || "assigned"} access.</p>
            </div>
            <div className="heading-actions">
              <button className="secondary-button" type="button">
                <ArchiveRestore aria-hidden="true" size={17} />
                Recycle Bin
              </button>
              <button className="primary-button" type="button" onClick={() => setUploadOpen(true)}>
                <Upload aria-hidden="true" size={17} />
                Upload
              </button>
            </div>
          </section>

          {error ? <p className="error-banner">{error}</p> : null}
          {uploadMessage ? <p className="loading-banner">{uploadMessage}</p> : null}
          {loading && !data ? <p className="loading-banner">Loading live repository data...</p> : null}

          <section className="kpi-grid" aria-label="Repository metrics">
            {kpis.map((kpi) => (
              <article className="metric" key={kpi.label}>
                <p>{kpi.label}</p>
                <strong>{kpi.value}</strong>
                <span>{kpi.detail}</span>
              </article>
            ))}
          </section>

          <section className="two-column">
            <article className="panel large-panel">
              <div className="panel-header">
                <div>
                  <h2>Repository Workspace</h2>
                  <p>{data?.folder?.breadcrumbs.map((item) => item.name).join(" / ") ?? "No folder selected"}</p>
                </div>
                <button className="text-button" type="button">View all</button>
              </div>

              <div className="toolbar">
                <button type="button">{data?.roots.length ?? 0} root folders</button>
                <button type="button">{data?.folder?.children.length ?? 0} child folders</button>
                <button type="button">{data?.files.length ?? 0} matching files</button>
                <button type="button">{data?.dashboard.smtpStatus ?? "smtp"} SMTP</button>
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
                    <span role="cell">
                      <button
                        className="row-icon-button"
                        type="button"
                        title={`Download ${file.originalName}`}
                        disabled={file.currentVersion?.scanStatus !== "CLEAN" || downloadingFileId === file.id}
                        onClick={() => void handleDownload(file)}
                      >
                        <Download aria-hidden="true" size={15} />
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
                <button type="button"><KeyRound size={17} /> Access Requests</button>
                <button type="button"><ShieldCheck size={17} /> My Permissions</button>
              </div>
            </aside>
          </section>

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
        </div>
      </section>

      {uploadOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-panel" aria-label="Upload file">
            <div className="panel-header">
              <div>
                <h2>Upload File</h2>
                <p>{data?.roots[0]?.name ?? "Company Repository"}</p>
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
    </main>
  );
}
