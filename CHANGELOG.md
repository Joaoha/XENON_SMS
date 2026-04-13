# Changelog

All notable changes to XENON Stock Management System are documented here.

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
