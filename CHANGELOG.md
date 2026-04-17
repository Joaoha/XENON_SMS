# Changelog

All notable changes to XENON Stock Management System are documented here.

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
