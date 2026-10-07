# Smart Interactive Dining Table Platform — Production Deployment Guide

This operational manual documents end-to-end deployment procedures across **Local Development**, **Staging**, and **High-Availability Production** environments.

---

## 1. System Architecture

```
                                  [ Internet / Dining Room LAN ]
                                                │
                                    HTTPS:443 / WSS / HTTP:80
                                                ▼
                         ┌─────────────────────────────────────────────┐
                         │              Nginx Gateway                  │
                         │    (SSL Termination, Gzip, Security Headers)│
                         └──────┬───────────────┬───────────────┬──────┘
                                │               │               │
             ┌──────────────────┴─┐             │          ┌────┴─────────────────┐
             │  /admin/           │             │          │  /kitchen/           │
             ▼                    ▼             ▼          ▼                      ▼
┌──────────────────┐    ┌──────────────────┐   ┌──────────────────┐    ┌──────────────────┐
│ admin-dashboard  │    │  customer-app    │   │   FastAPI API    │    │     kds-app      │
│  (Next.js :3001) │    │  (Next.js :3000) │   │ (Python 3.12:8000│    │  (Next.js :3002) │
└──────────────────┘    └──────────────────┘   └────────┬─────────┘    └──────────────────┘
                                                        │
                                        ┌───────────────┴───────────────┐
                                        ▼                               ▼
                             ┌──────────────────┐            ┌──────────────────┐
                             │  PostgreSQL 16   │            │     Redis 7      │
                             │ (Relational Data)│            │(Cache & Pub/Sub) │
                             └────────┬─────────┘            └──────────────────┘
                                      │
                                      ▼
                             ┌──────────────────┐
                             │ db-backup Engine │
                             │(Daily Cron+Prune)│
                             └──────────────────┘
```

---

## 2. Environment Comparison Matrix

| Parameter | Local Development | Staging (Restaurant LAN) | Production (Cloud / On-Prem) |
| :--- | :--- | :--- | :--- |
| **Orchestration** | Local npm / Python venv or Docker | Docker Compose | Docker Compose / Kubernetes |
| **Database** | SQLite / Local Postgres | PostgreSQL 16 Alpine | PostgreSQL 16 (Managed / RDS / High-Availability) |
| **Cache & Bus** | In-Memory FastCache | Redis 7 Alpine | Redis 7 Cluster / ElastiCache |
| **SSL / TLS** | Plain HTTP or Self-Signed | 4096-bit Self-Signed with SAN | Let's Encrypt / Commercial CA |
| **Domain** | `localhost` | `smarttable.local` / LAN IP | `dining.restaurant.com` |
| **Logging Format** | Console colorized text | JSON Structured | JSON Streamed to Datadog/ELK |
| **Kiosk Security** | Developer bypass allowed | Emergency PIN enforced | Strict KioskGuard OS lock |

---

## 3. Local Development Deployment

### Prerequisites
- Node.js 20+ & npm
- Python 3.12+

### Step-by-Step Execution
1. **Clone repository & install dependencies:**
   ```bash
   git clone <repo-url>
   cd "table website"
   npm install
   ```

2. **Setup backend virtual environment:**
   ```bash
   cd backend
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Initialize local database & seed demo restaurant:**
   ```bash
   python -c "from app.core.database import SessionLocal; from app.db.seed import seed_database; seed_database(SessionLocal())"
   ```

4. **Launch development servers:**
   ```bash
   # From root:
   npm run dev:backend   # API on http://localhost:8000
   npm run dev:customer  # Customer Table on http://localhost:3000
   npm run dev:admin     # Admin Portal on http://localhost:3001
   npm run dev:kds       # Kitchen Display on http://localhost:3002
   ```

---

## 4. Staging Deployment (Docker Compose)

Staging mirrors production using containerized PostgreSQL, Redis, Nginx, and automated backups on a local test server or staging VM.

### Step-by-Step Execution
1. **Generate SSL Certificates:**
   ```bash
   python infra/nginx/generate_certs.py
   # Or on Linux:
   chmod +x infra/nginx/generate_ssl_certs.sh && ./infra/nginx/generate_ssl_certs.sh
   ```

2. **Configure Environment:**
   ```bash
   cp .env.example .env
   # Edit .env with staging passwords and secure SECRET_KEY
   ```

3. **Start All 8 Services:**
   ```bash
   docker compose up -d --build
   ```

4. **Verify Container Health:**
   ```bash
   docker compose ps
   ```
   All containers (`smart_table_postgres`, `smart_table_redis`, `smart_table_api`, `smart_table_customer_app`, `smart_table_admin_dashboard`, `smart_table_kds_app`, `smart_table_nginx`, `smart_table_db_backup`) should report `healthy`.

---

## 5. Production Deployment

### 1. Secrets Management Policy
> [!IMPORTANT]
> **Zero Secrets Policy:** Never commit `.env`, private keys, database passwords, or API keys to Git. Inject secrets via Docker Secrets, AWS Secrets Manager, HashiCorp Vault, or deployment CI/CD environment variables.

Generate production secrets:
```bash
# Generate 64-character random SECRET_KEY:
python -c "import secrets; print(secrets.token_hex(32))"

# Generate strong database password:
python -c "import secrets; print(secrets.token_urlsafe(24))"
```

### 2. Commercial SSL / Let's Encrypt Setup
For domains (e.g. `dining.yourrestaurant.com`):
```bash
# Obtain certificate using Certbot:
docker run -it --rm --name certbot \
  -v "$(pwd)/infra/nginx/ssl:/etc/letsencrypt" \
  -v "certbot_www:/var/www/certbot" \
  certbot/certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  -d dining.yourrestaurant.com
```
Update [`infra/nginx/nginx.conf`](file:///e:/table%20website/infra/nginx/nginx.conf):
```nginx
ssl_certificate     /etc/letsencrypt/live/dining.yourrestaurant.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/dining.yourrestaurant.com/privkey.pem;
```

### 3. Production Launch
```bash
docker compose -f docker-compose.yml up -d
```

---

## 6. Health & Readiness Probe Verification

Orchestrators (Kubernetes, AWS ECS, Docker Swarm, Nginx) use these probes to verify container lifecycle:

### Liveness Probe (`GET /health`)
- **Purpose:** Verifies that the API process is alive and responding.
- **Probe URL:** `https://<host>/health` or `http://localhost:8000/health`
- **Expected Status:** HTTP 200 OK
- **Payload:**
  ```json
  {
    "status": "ok",
    "service": "Smart Interactive Dining Table API"
  }
  ```

### Readiness Probe (`GET /ready`)
- **Purpose:** Verifies backend connectivity to critical downstream dependencies (PostgreSQL database and Redis event bus).
- **Probe URL:** `https://<host>/ready` or `http://localhost:8000/ready`
- **Expected Status:** HTTP 200 OK (or HTTP 503 if database is unreachable).
- **Payload:**
  ```json
  {
    "status": "HEALTHY",
    "environment": "production",
    "version": "1.0.0",
    "dependencies": {
      "database": {
        "status": "UP",
        "type": "PostgreSQL"
      },
      "redis": {
        "status": "UP",
        "type": "Cache & Event Bus"
      }
    }
  }
  ```

---

## 7. Database Backup & Disaster Recovery Strategy

The platform includes an automated backup container (`db-backup`) that runs daily at 03:00 UTC and retains 14 days of encrypted, compressed snapshots.

### Manual Backup On-Demand
```bash
docker compose exec db-backup /backup.sh
```
Backups are archived in the `db_backups` Docker volume as:
`/backups/smart_table_backup_YYYYMMDD_HHMMSS.sql.gz`

### Disaster Recovery / Database Restoration
To restore a snapshot in the event of hardware failure:
```bash
docker compose exec -T db-backup /restore.sh /backups/smart_table_backup_20261003_030000.sql.gz
```

---

## 8. Physical 32" Table Kiosk Provisioning

1. **Hardware Configuration:** Mini PC (Intel NUC or AMD Ryzen Embedded) connected via HDMI to 32" 1080p/4K capacitive touch display.
2. **OS Configuration:** Ubuntu 24.04 LTS Desktop or Windows 11 Enterprise in Assigned Access Kiosk mode.
3. **Browser Launch Command (Chromium Kiosk):**
   ```bash
   chromium-browser \
     --kiosk \
     --noerrdialogs \
     --disable-infobars \
     --check-for-update-interval=31536000 \
     --disable-pinch \
     --overscroll-history-navigation=0 \
     --app=https://smarttable.local/
   ```
4. **Emergency Manager Exit:**
   - Tap table header logo 5 times in rapid succession.
   - Enter manager security PIN (`7788`).
   - Select **Exit Kiosk** or **Trigger Diagnostics**.
