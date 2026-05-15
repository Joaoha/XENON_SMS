# Changelog

All notable changes to XENON Stock Management System are documented here.

## [1.3.0] — 2026-05-15

### New Features

- **Bulk CSV import for destination rack locations** — Admin can download a CSV template, upload a filled file, preview parsed rows with row-level validation errors, and commit. Supports the full Data Hall → Row → Rack hierarchy in a single CSV. Idempotent: re-importing the same file produces 0 created, N skipped. All-or-nothing transactional commit. ImportLog audit trail captures user, filename, counts, and errors per import.
- **Persistent backups volume** — Backups now live in a named Docker volume mounted at `/app/backups`, preserved across container rebuilds. New admin pages and API routes for triggering daily/weekly/monthly/full backups and downloading the resulting CSV + JSON sidecar files.

### Fixes

- Prevent duplicate items in handout profiles.
- Ensure the in-container backups directory is writable in the Docker image.

### Schema Changes

1 new database migration (`20260512000000_add_import_log`) for the `ImportLog` audit table. Applied automatically on container startup.

### Docs

- Added "Updating the deployed app" sections to README and DEPLOYMENT covering the `git pull origin main && docker compose up -d --build` flow, with single-image and bare-metal variants and a warning against `docker compose down -v` on routine updates.

---

## [1.1.0] — 2026-04-17

### New Features

- **Warehouse storage locations** — New Warehouse → Row → Shelf hierarchy for tracking where stock is physically stored. Stock items can be assigned a storage location. Admin UI at Admin → Storage Locations.
- **Stock transfers** — Transfer stock between warehouses with a dedicated Transfer page and API. Per-warehouse balance tracking via new `StockBalance` model.
- **Per-warehouse dashboard** — Dashboard now shows stock balances filtered by warehouse.
- **User management UI** — Admin can add, edit, and delete user accounts directly from Admin → Users.
- **Picking list PDF** — Generate PDF picking lists from handout transactions (powered by jsPDF).
- **Manual picker name entry** — Picker field now supports free-text entry with datalist autocomplete from known pickers.
- **Batch transactions** — Group related transactions by batch ID.

### Fixes

- Fixed 500 errors in Receive Stock and transaction endpoints.
- Fixed error handling in user management API.
- Granted operator role access to Stock Items, Destinations, and Storage Locations pages.
- Fixed dark mode styling for warehouse location rows.
- Fixed key prop warnings in dashboard table.
- Improved removal checks and error messages for storage locations (warehouse, row, shelf).
- Soft-deleted locations are now reactivated when re-creating with the same name.
- Stock item storage location is now persisted on receive so it appears in the PDF.

### Schema Changes

7 new database migrations. Run `prisma migrate deploy` to apply (Docker does this automatically on startup).

---

## [1.0.0] — 2026-04-13

### Initial Release

First production release of the XENON Stock Management System.

#### Features

- **User authentication** — Secure login with username/password. Role-based access: `admin` and `operator`.
- **Stock item master** — Create and manage stock items with SKU, name, description, and unit.
- **Destination hierarchy** — Data Hall → Row → Rack structure for precise location tracking.
- **Receive stock** — Record incoming stock with item, quantity, date/time, user, and optional notes/reference.
- **Hand out stock** — Record stock handout with item, quantity, picker identity, destination (Data Hall/Row/Rack), and optional notes.
- **Stock visibility** — Current stock balance view with search and filtering.
- **Transaction history** — Full audit trail of all stock movements; soft-delete with admin override.
- **Reporting** — Stock on hand, movements by date range, by person, by destination. CSV export.
- **Admin panel** — Manage users, stock items, and destination hierarchy.
- **App name updated** — Renamed from "XENON SMS" to "XENON Stock Management System" throughout the UI.
