const apiBase = (process.env.API_BASE ?? "http://localhost:4000/api/v1").replace(/\/$/, "");
const email = process.env.SMOKE_EMAIL ?? "admin@company.com";
const password = process.env.SMOKE_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? "Admin@12345";

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers ?? {})
    }
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${path} failed with HTTP ${response.status}: ${text}`);
  }

  return body;
}

async function main() {
  const checks = [];

  const health = await request("/health");
  checks.push({ name: "health", status: health.status ?? "ok" });

  const login = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });

  const token = login.accessToken;
  if (!token) {
    throw new Error("Login did not return an access token");
  }
  checks.push({ name: "login", user: login.user?.email ?? email });

  const protectedChecks = [
    ["admin dashboard", "/admin/dashboard"],
    ["roles", "/roles"],
    ["storage report", "/reports/storage"],
    ["smtp settings", "/settings/smtp"],
    ["system settings", "/settings/system"],
    ["email templates", "/settings/email-templates"]
  ];

  for (const [name, path] of protectedChecks) {
    const body = await request(path, { token });
    checks.push({ name, ok: Boolean(body) });
  }

  console.log(JSON.stringify({
    apiBase,
    checkedAt: new Date().toISOString(),
    checks
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
