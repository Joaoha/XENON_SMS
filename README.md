# XENON Stock Management System

Internal web application for tracking stock receipt, stock handout, picker identity, and destination (Data Hall → Row → Rack). Includes warehouse storage locations, inter-warehouse transfers, and PDF picking lists.

**Version:** 1.2.0

---

## One-Line Install (Linux)

```bash
curl -fsSL https://raw.githubusercontent.com/Joaoha/XENON_SMS/refs/heads/main/install.sh | bash
```

This installs Docker (if needed), clones the repo to `~/xenon-sms`, generates secrets, and starts the app. Tested on Ubuntu 22.04/24.04 and Fedora 39/40.

Override defaults with environment variables:

```bash
XENON_INSTALL_DIR=/opt/xenon XENON_PORT=8080 bash install.sh
```

After install, open **http://localhost:3000** and create your admin user:

```bash
curl -X POST http://localhost:3000/api/seed \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "changeme"}'
```

### Uninstall

```bash
~/xenon-sms/uninstall.sh
```

Stops containers, removes Docker volumes (including the database), and optionally removes the install directory and Docker itself. Interactive prompts prevent accidental data loss.

### Manage

```bash
cd ~/xenon-sms
docker compose logs -f      # view logs
docker compose stop          # stop the app
docker compose start         # start the app
docker compose up -d --build # rebuild after updates
```

---

## Quick Start — Docker (Manual)

The fastest way to run XENON SMS is a single Docker container connected to your PostgreSQL database.

### 1. Create your environment file

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/xenon_sms"
AUTH_SECRET="your-secret-here"   # openssl rand -base64 32
```

### 2. Build the image

```bash
docker build -t xenon-sms:1.2.0 .
```

### 3. Run

```bash
docker run -d \
  --name xenon-sms \
  --env-file .env \
  -p 3000:3000 \
  xenon-sms:1.2.0
```

That's it. The container automatically runs database migrations on startup, then serves the app at **http://localhost:3000**.

### 4. Create the first admin user

```bash
curl -X POST http://localhost:3000/api/seed \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "changeme"}'
```

> Change the admin password after first login — **Admin → Users**.

---

## Don't have PostgreSQL?

Use `docker-compose.yml` to spin up a bundled Postgres database alongside the app:

```bash
# Add POSTGRES_PASSWORD to your .env first
echo 'POSTGRES_PASSWORD=changeme' >> .env

docker compose up -d --build
```

Docker Compose automatically reads `.env` from the current directory — no extra flags needed.

---

## Features

- **User auth** — Secure login, role-based access (admin / operator)
- **Stock items** — SKU-based item master with units and storage location assignment
- **Destinations** — Data Hall → Row → Rack hierarchy for handout tracking
- **Storage locations** — Warehouse → Row → Shelf hierarchy for physical stock location
- **Receive stock** — Record incoming stock with quantity, notes, and reference
- **Hand out stock** — Record stock handout with picker identity and destination
- **Transfer stock** — Move stock between warehouses with per-warehouse balance tracking
- **Stock balances** — Live stock-on-hand view with search, per-warehouse filtering
- **Transaction history** — Full audit trail, soft-delete with admin override
- **Reports** — Stock on hand, movements by date/person/destination, CSV export
- **PDF picking lists** — Generate picking list PDFs from handout transactions
- **User management** — Admin can add, edit, and remove user accounts

---

## Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) — Full deployment guide (Docker, bare metal, local dev)
- [CHANGELOG.md](./CHANGELOG.md) — Release history
