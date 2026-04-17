# XENON Stock Management System — Deployment Guide

Version: **1.1.0**

---

## Prerequisites

For Docker deployments, Docker Engine 24+ is the only requirement — no local Node.js or PostgreSQL needed.

For bare-metal deployments:

| Requirement | Version |
|-------------|---------|
| Node.js     | 18+     |
| PostgreSQL  | 14+     |
| npm         | 9+      |

---

## Environment Variables

| Variable            | Required    | Description                                                                                     |
|---------------------|-------------|-------------------------------------------------------------------------------------------------|
| `DATABASE_URL`      | Yes         | PostgreSQL connection string, e.g. `postgresql://user:pass@host:5432/xenon_sms`                 |
| `AUTH_SECRET`       | Yes         | Random secret for JWT signing — minimum 32 characters. Generate with `openssl rand -base64 32`. |
| `PORT`              | No          | HTTP port (default: `3000`)                                                                     |
| `POSTGRES_PASSWORD` | Docker Compose only | Password for the bundled Postgres container                                             |

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
# then edit .env
```

---

## Option A: Single Docker Image (Recommended)

Build one image, pass one env file, run. You supply the PostgreSQL database; the container handles everything else including running migrations on startup.

### 1. Set up your environment file

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/xenon_sms"
AUTH_SECRET="your-secret"   # openssl rand -base64 32
```

### 2. Build the image

```bash
docker build -t xenon-sms:1.1.0 .
```

### 3. Run

```bash
docker run -d \
  --name xenon-sms \
  --env-file .env \
  -p 3000:3000 \
  --restart unless-stopped \
  xenon-sms:1.1.0
```

The container will:
1. Run `prisma migrate deploy` (safe to run on every start — already-applied migrations are skipped).
2. Start the Next.js server on port 3000.

### 4. Seed the initial admin user

```bash
curl -X POST http://localhost:3000/api/seed \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "changeme"}'
```

> **Important:** Change the admin password after first login — Admin → Users.

### Updating to a new version

```bash
docker build -t xenon-sms:NEW_VERSION .
docker stop xenon-sms && docker rm xenon-sms
docker run -d --name xenon-sms --env-file .env -p 3000:3000 --restart unless-stopped xenon-sms:NEW_VERSION
```

Migrations run automatically on startup.

---

## Option B: Docker Compose (includes bundled Postgres)

Use this if you don't have an external PostgreSQL. Spins up Postgres 16 + the app together.

### 1. Set up your environment file

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
AUTH_SECRET="your-secret"          # openssl rand -base64 32
POSTGRES_PASSWORD="a-strong-password"
```

Docker Compose reads `.env` from the current directory automatically — no extra flags needed.

### 2. Build and start

```bash
docker compose up -d --build
```

The app will wait for Postgres to be healthy, then run migrations, then start.

### 3. Seed the initial admin user

```bash
curl -X POST http://localhost:3000/api/seed \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "changeme"}'
```

### Managing the stack

```bash
docker compose down          # stop (database volume preserved)
docker compose down -v       # stop and wipe the database
docker compose up -d         # restart without rebuilding
docker compose up -d --build # rebuild and restart
```

---

## Option C: Bare Metal / VPS

### 1. Install dependencies

```bash
npm ci --omit=dev
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your DATABASE_URL and AUTH_SECRET
```

### 3. Run database migrations

```bash
npx prisma migrate deploy
```

### 4. Build and start

```bash
npm run build
npm run start
```

Or with a process manager:

```bash
npm install -g pm2
pm2 start npm --name xenon-sms -- start
pm2 save && pm2 startup
```

### Reverse proxy (nginx)

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

Migrations are tracked in `prisma/migrations/`. To apply pending migrations:

```bash
npx prisma migrate deploy
```

Safe to run on every deployment — already-applied migrations are skipped. Docker containers run this automatically on startup.

---

## Local Development

### 1. Install all dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with a local PostgreSQL connection string and a generated AUTH_SECRET
```

### 3. Run migrations and start

```bash
npx prisma migrate dev
npm run dev
```

App runs at http://localhost:3000.

### Run tests

```bash
npm test
```

---

## Post-Deploy Checklist

- [ ] Migrations applied without errors
- [ ] Seeded initial admin: `POST /api/seed`
- [ ] Logged in and changed the admin password (Admin → Users)
- [ ] Created stock items (Admin → Stock Items)
- [ ] Set up destination hierarchy: Data Halls → Rows → Racks (Admin → Destinations)
- [ ] Set up storage locations: Warehouses → Rows → Shelves (Admin → Storage Locations)
- [ ] Created operator accounts for field staff (Admin → Users)
- [ ] Confirmed stock balance view shows correct data
- [ ] Confirmed CSV export works from the Reports page

---

## Troubleshooting

**"connection refused" on startup**
Ensure the database is running and `DATABASE_URL` is correct. For Docker Compose, the `db` health check must pass before `app` starts.

**`AUTH_SECRET` error on startup**
The secret must be at least 32 characters. Generate one with `openssl rand -base64 32`.

**Build fails with TypeScript errors**
Ensure `node_modules` is fully installed (`npm ci`) and Prisma client is generated (`npx prisma generate`).

**Container can't reach external database**
Ensure the database host is reachable from inside the container. Use the host machine's IP or a Docker network alias — `localhost` inside the container refers to the container itself, not the host.
