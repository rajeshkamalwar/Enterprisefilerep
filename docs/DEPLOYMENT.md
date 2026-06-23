# Production Deployment

This guide deploys the Enterprise File Repository on a Hostinger VPS using Docker Compose, Nginx, SSL, PostgreSQL, Redis, Meilisearch, ClamAV, background workers, SMTP, and local backup metadata snapshots.

## 1. Server Baseline

- VPS: Ubuntu 22.04 LTS or 24.04 LTS.
- Minimum pilot size: 2 vCPU, 4 GB RAM, 80 GB SSD.
- Recommended company deployment: 4 vCPU, 8-16 GB RAM, storage sized to repository growth.
- DNS: point `files.example.com` to the VPS public IP.
- Firewall: open `22`, `80`, and `443`; keep app ports bound to `127.0.0.1`.

## 2. Install Packages

```bash
sudo apt update
sudo apt install -y ca-certificates curl git nginx certbot python3-certbot-nginx
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Log out and back in after adding the user to the Docker group.

## 3. Prepare Application

```bash
git clone https://github.com/rajeshkamalwar/Enterprisefilerep.git
cd Enterprisefilerep
cp docs/env.production.example .env.production
nano .env.production
```

Replace every secret and domain placeholder in `.env.production`.

## 4. Start Services

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

Run database migration and seed:

```bash
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy --config prisma.config.ts
docker compose -f docker-compose.prod.yml exec backend npm run prisma:seed -w @filerepo/backend
```

After the first seed, change the seeded admin password from the UI or rotate `SEED_ADMIN_PASSWORD` and reseed only during a controlled maintenance window.

## 5. Configure Nginx

```bash
sudo cp config/nginx/filerepo.conf /etc/nginx/sites-available/filerepo.conf
sudo nano /etc/nginx/sites-available/filerepo.conf
sudo ln -s /etc/nginx/sites-available/filerepo.conf /etc/nginx/sites-enabled/filerepo.conf
sudo nginx -t
sudo systemctl reload nginx
```

Update `server_name` before reload.

## 6. Enable SSL

```bash
sudo certbot --nginx -d files.example.com -d www.files.example.com
sudo certbot renew --dry-run
```

Then update `.env.production`:

```text
APP_URL=https://files.example.com
PUBLIC_API_URL=https://files.example.com/api/v1
CORS_ORIGINS=https://files.example.com
```

Restart after env changes:

```bash
docker compose -f docker-compose.prod.yml up -d
```

## 7. SMTP Setup

In the ERP UI, open `Settings > SMTP`.

- Host: provider SMTP hostname.
- Port: usually `587`.
- Secure: false for STARTTLS on port `587`; true only for implicit TLS on `465`.
- Require TLS: true.
- Username: provider mailbox or API username.
- Password: provider password or app password.
- From email: approved sending address.
- Reply-to: monitored support address.

Send a test email before accepting the deployment.

## 8. Backups

Manual backup metadata snapshot:

```bash
docker compose -f docker-compose.prod.yml exec backend npm run worker:backup -w @filerepo/backend
```

PostgreSQL dump:

```bash
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U filerepo filerepo > backups/postgres-$(date +%F-%H%M).sql
```

Daily cron example:

```cron
0 2 * * * cd /opt/Enterprisefilerep && docker compose -f docker-compose.prod.yml exec -T backend npm run worker:backup -w @filerepo/backend >> backups/backup.log 2>&1
15 2 * * * cd /opt/Enterprisefilerep && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U filerepo filerepo > backups/postgres-$(date +\%F-\%H\%M).sql
```

Copy `/opt/Enterprisefilerep/backups` and `/opt/Enterprisefilerep/storage` to off-server storage.

## 9. Search Reindex

Run after large imports, migration fixes, or Meilisearch restore:

```bash
docker compose -f docker-compose.prod.yml exec backend npm run worker:search-reindex -w @filerepo/backend
```

## 10. Smoke Test

From a machine that can reach the deployment:

```bash
API_BASE=https://files.example.com/api/v1 SMOKE_EMAIL=admin@company.com SMOKE_PASSWORD='your-password' npm run smoke:test
```

The smoke test checks health, login, admin dashboard, roles, reports, SMTP settings, system settings, and email templates.

## 11. PM2 Alternative

Docker Compose is the preferred production path. If the client requires process-manager deployment, use `ecosystem.config.cjs` after installing PostgreSQL, Redis, Meilisearch, and ClamAV separately:

```bash
npm ci
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

## 12. Release Checklist

- `npm run typecheck` passes.
- `npm run build` passes.
- `docker compose -f docker-compose.prod.yml config` passes.
- Nginx config test passes.
- SSL is valid.
- SMTP test email is delivered.
- Backup command creates a timestamped directory.
- Smoke test passes against the final URL.
- Client acceptance checklist is signed off.
