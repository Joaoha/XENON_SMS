# XENON Stock Management System — Deployment Guide

Version: **1.0.0**

---

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js     | 18+     |
| PostgreSQL  | 14+     |
| npm         | 9+      |

For Docker deployments, Docker Engine 24+ and Docker Compose v2 are sufficient — no local Node.js or PostgreSQL required.

---

## Environment Variables

| Variable            | Required    | Description                                                                                   |
|---------------------|-------------|-----------------------------------------------------------------------------------------------|
| `DATABASE_URL`      | Yes         | PostgreSQL connection string, e.g. `postgresql://user:pass@host:5432/xenon_sms`               |
| `AUTH_SECRET`       | Yes         | Random secret for JWT signing — minimum 32 characters. Generate with `openssl rand -base64 32`. |
| `PORT`              | No          | HTTP port (default: `3000`)                                                                   |
| `POSTGRES_PASSWORD` | Docker only | Password for the bundled Postgres container (docker-compose)                                  |

Copy `.env.example` to `.env.local` and fill in your values before building or running the app.

---

## Option A: Docker Compose (Recommended)

The simplest path to production. Spins up a Postgres database and the app together.

### 1. Configure secrets

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
AUTH_SECRET="$(openssl rand -base64 32)"
POSTGRES_PASSWORD="a-strong-db-password"
```

### 2. Build and start

```bash
docker compose --env-file .env.local up -d --build
```

The app will:
1. Wait for Postgres to be healthy.
2. Run `prisma migrate deploy` to apply all migrations.
3. Start the Next.js server on port 3000.

### 3. Seed the initial admin user

```bash
curl -X POST http://localhost:3000/api/seed \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "changeme"}'
```

> **Important:** Change the admin password after first login — Admin → Users.

### 4. Verify

Open http://localhost:3000 and log in with the admin credentials.

### Stopping and restarting

```bash
docker compose down          # stop (data preserved in volume)
docker compose down -v       # stop and wipe the database
docker compose up -d         # restart without rebuilding
docker compose up -d --build # rebuild and restart
```

---

## Option B: Docker (standalone container)

Use this when you supply your own external PostgreSQL instance.

### 1. Build the image

```bash
docker build -t xenon-sms:1.0.0 .
```

### 2. Run

```bash
docker run -d \
  --name xenon-sms \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/xenon_sms" \
  -e AUTH_SECRET="$(openssl rand -base64 32)" \
  xenon-sms:1.0.0
```

The container runs `prisma migrate deploy` on startup before launching the server.

---

## Option C: Bare Metal / VPS

### 1. Install dependencies

```bash
npm ci --omit=dev
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL and AUTH_SECRET
```

### 3. Generate Prisma client

```bash
npx prisma generate
```

### 4. Run database migrations

```bash
npx prisma migrate deploy
```

### 5. Build for production

```bash
npm run build
```

### 6. Start the server

```bash
npm run start
```

Or, with a process manager (recommended):

```bash
npm install -g pm2
pm2 start npm --name xenon-sms -- start
pm2 save
pm2 startup
```

### Reverse proxy (nginx)

Run the app behind nginx for SSL termination:

```nginx
server {
    listen 443 ssl;
    server_name xenon.internal;

    ssl_certificate     /etc/ssl/certs/xenon.crt;
    ssl_certificate_key /etc/ssl/private/xenon.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Database Migrations

When deploying a new version that includes schema changes:

```bash
npx prisma migrate deploy
```

This applies any pending migrations without interactive prompts. It is safe to run on every deployment — already-applied migrations are skipped.

For Docker Compose, migrations run automatically on container startup.

---

## Local Development

### 1. Install all dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local with a local PostgreSQL connection string and a generated AUTH_SECRET
```

### 3. Run migrations

```bash
npx prisma migrate dev
```

### 4. Start the dev server

```bash
npm run dev
```

App runs at http://localhost:3000.

### 5. Run tests

```bash
npm test
```

---

## Post-Deploy Checklist

- [ ] `prisma migrate deploy` completed without errors
- [ ] Seeded initial admin: `POST /api/seed`
- [ ] Logged in and changed the admin password (Admin → Users)
- [ ] Created stock items (Admin → Stock Items)
- [ ] Set up destination hierarchy: Data Halls → Rows → Racks (Admin → Destinations)
- [ ] Created operator accounts for field staff (Admin → Users)
- [ ] Confirmed stock balance view shows correct data
- [ ] Confirmed CSV export works from the Reports page

---

## Troubleshooting

**`prisma migrate deploy` fails with "connection refused"**
Ensure the database is running and `DATABASE_URL` is correct. For Docker Compose, the `db` service health check must pass before `app` starts.

**`AUTH_SECRET` error on startup**
The secret must be at least 32 characters. Generate one with `openssl rand -base64 32`.

**Build fails with TypeScript errors**
Run `npx tsc --noEmit` to see all errors. Ensure `node_modules` is fully installed with `npm ci`.

**Docker image cannot connect to external database**
If using `--network host` or bridged networking, ensure the container can reach the database host. For Docker Compose, the service name `db` is the hostname for the bundled Postgres.
