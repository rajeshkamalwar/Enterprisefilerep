import {
  Activity,
  ArchiveRestore,
  Bell,
  Building2,
  ChartNoAxesCombined,
  Database,
  FileText,
  FolderTree,
  Gauge,
  Heart,
  History,
  KeyRound,
  LockKeyhole,
  Mail,
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

const kpis = [
  { label: "Total Files", value: "24,890", detail: "1,284 added this month" },
  { label: "Storage Used", value: "1.8 TB", detail: "62% of current VPS allocation" },
  { label: "Active Users", value: "143", detail: "18 countries and locations" },
  { label: "Pending Reviews", value: "12", detail: "Access and restore requests" }
];

const folders = [
  { name: "Finance / India / FY 2026", owner: "Finance India", className: "Confidential", status: "Clean", updated: "Today" },
  { name: "HR / Global Policies", owner: "HR Global", className: "Internal", status: "Clean", updated: "Yesterday" },
  { name: "Legal / Vendor Contracts", owner: "Legal", className: "Restricted", status: "Scanning", updated: "Jun 21" },
  { name: "Projects / Alpha / Deliverables", owner: "Project Alpha", className: "Internal", status: "Clean", updated: "Jun 20" }
];

const health = [
  { name: "API", state: "Healthy" },
  { name: "Database", state: "Healthy" },
  { name: "Redis Queue", state: "Healthy" },
  { name: "Search", state: "Indexing" },
  { name: "ClamAV", state: "Healthy" },
  { name: "SMTP", state: "Needs Test" }
];

const activities = [
  "Finance India uploaded 18 invoice files",
  "Legal restricted access to Vendor Contracts",
  "Backup completed at 02:00 IST",
  "ClamAV scan queue cleared",
  "Project Alpha folder permissions updated"
];

export default function Home() {
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
          <div className="search-box">
            <Search aria-hidden="true" size={18} />
            <input aria-label="Search files, folders, tags, users, and audit logs" placeholder="Search files, folders, tags, users..." />
          </div>
          <div className="topbar-actions">
            <button className="icon-button" type="button" title="Notifications">
              <Bell aria-hidden="true" size={18} />
            </button>
            <button className="profile-button" type="button">
              RK
            </button>
          </div>
        </header>

        <div className="content">
          <section className="page-heading">
            <div>
              <p className="eyebrow">Enterprise MVP Dashboard</p>
              <h1>Company File Repository</h1>
              <p className="page-copy">Governed documents, RBAC, audit trails, storage health, SMTP alerts, and daily file operations in one ERP-style workspace.</p>
            </div>
            <div className="heading-actions">
              <button className="secondary-button" type="button">
                <ArchiveRestore aria-hidden="true" size={17} />
                Recycle Bin
              </button>
              <button className="primary-button" type="button">
                <Upload aria-hidden="true" size={17} />
                Upload
              </button>
            </div>
          </section>

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
                  <p>Role-aware folders and files</p>
                </div>
                <button className="text-button" type="button">View all</button>
              </div>

              <div className="toolbar">
                <button type="button">Department</button>
                <button type="button">Project</button>
                <button type="button">Classification</button>
                <button type="button">Scan Status</button>
              </div>

              <div className="data-table" role="table" aria-label="Repository folders">
                <div className="table-row table-head" role="row">
                  <span role="columnheader">Name</span>
                  <span role="columnheader">Owner</span>
                  <span role="columnheader">Class</span>
                  <span role="columnheader">Status</span>
                  <span role="columnheader">Updated</span>
                </div>
                {folders.map((folder) => (
                  <div className="table-row" role="row" key={folder.name}>
                    <span role="cell" className="file-name">
                      <FolderTree aria-hidden="true" size={16} />
                      {folder.name}
                    </span>
                    <span role="cell">{folder.owner}</span>
                    <span role="cell">
                      <span className={`badge ${folder.className.toLowerCase()}`}>{folder.className}</span>
                    </span>
                    <span role="cell">
                      <span className="status">{folder.status}</span>
                    </span>
                    <span role="cell">{folder.updated}</span>
                  </div>
                ))}
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
                  <p>Operational readiness</p>
                </div>
              </div>
              <div className="health-list">
                {health.map((item) => (
                  <div className="health-item" key={item.name}>
                    <span><Database size={16} /> {item.name}</span>
                    <strong>{item.state}</strong>
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
                {activities.map((activity) => (
                  <li key={activity}>{activity}</li>
                ))}
              </ol>
            </article>
          </section>
        </div>
      </section>
    </main>
  );
}
