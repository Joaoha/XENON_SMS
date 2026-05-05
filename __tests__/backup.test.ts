import { describe, it, expect } from "vitest"
import {
  getDateRange,
  generateCSV,
  generateSidecar,
  escapeCSV,
  buildEntityLookup,
  type TransactionRow,
} from "@/lib/backup"

const mockTransaction: TransactionRow = {
  id: "txn-001",
  type: "RECEIVE",
  stockItemId: "item-001",
  quantity: 50,
  userId: "user-001",
  pickedBy: null,
  dataHallId: null,
  rowId: null,
  rackId: null,
  sourceWarehouseId: null,
  destinationWarehouseId: "wh-001",
  notes: "Test delivery",
  reference: "PO-123",
  batchId: null,
  createdAt: new Date("2026-04-15T10:30:00Z"),
  stockItem: { sku: "CAB-001", name: "Cat6 Cable", unit: "meters" },
  user: { username: "admin" },
  dataHall: null,
  row: null,
  rack: null,
  sourceWarehouse: null,
  destinationWarehouse: { code: "WH1", name: "Main Warehouse" },
}

const mockHandout: TransactionRow = {
  id: "txn-002",
  type: "HANDOUT",
  stockItemId: "item-001",
  quantity: 10,
  userId: "user-002",
  pickedBy: "John",
  dataHallId: "dh-001",
  rowId: "row-001",
  rackId: "rack-001",
  sourceWarehouseId: "wh-001",
  destinationWarehouseId: null,
  notes: null,
  reference: null,
  batchId: "batch-001",
  createdAt: new Date("2026-04-16T14:00:00Z"),
  stockItem: { sku: "CAB-001", name: "Cat6 Cable", unit: "meters" },
  user: { username: "operator1" },
  dataHall: { code: "DH1", name: "Data Hall Alpha" },
  row: { name: "Row A" },
  rack: { name: "Rack 1" },
  sourceWarehouse: { code: "WH1", name: "Main Warehouse" },
  destinationWarehouse: null,
}

describe("escapeCSV", () => {
  it("wraps values in double quotes", () => {
    expect(escapeCSV("hello")).toBe('"hello"')
  })

  it("escapes internal double quotes", () => {
    expect(escapeCSV('say "hi"')).toBe('"say ""hi"""')
  })

  it("prefixes formula-like values with single quote", () => {
    expect(escapeCSV("=SUM(A1)")).toBe("\"'=SUM(A1)\"")
    expect(escapeCSV("+cmd")).toBe("\"'+cmd\"")
    expect(escapeCSV("-data")).toBe("\"'-data\"")
    expect(escapeCSV("@import")).toBe("\"'@import\"")
  })

  it("does not prefix normal values", () => {
    expect(escapeCSV("normal value")).toBe('"normal value"')
  })
})

describe("getDateRange", () => {
  it("daily returns previous day midnight-to-midnight UTC", () => {
    const ref = new Date("2026-04-20T10:00:00Z")
    const { from, to } = getDateRange("daily", ref)
    expect(from.toISOString()).toBe("2026-04-19T00:00:00.000Z")
    expect(to.toISOString()).toBe("2026-04-19T23:59:59.999Z")
  })

  it("weekly returns previous Monday to Sunday", () => {
    const ref = new Date("2026-04-20T10:00:00Z") // Monday
    const { from, to } = getDateRange("weekly", ref)
    expect(from.toISOString()).toBe("2026-04-13T00:00:00.000Z")
    expect(to.toISOString()).toBe("2026-04-19T23:59:59.999Z")
  })

  it("monthly returns previous full month", () => {
    const ref = new Date("2026-05-05T10:00:00Z")
    const { from, to } = getDateRange("monthly", ref)
    expect(from.toISOString()).toBe("2026-04-01T00:00:00.000Z")
    expect(to.toISOString()).toBe("2026-04-30T23:59:59.999Z")
  })
})

describe("generateCSV", () => {
  it("includes BOM for Excel compatibility", () => {
    const csv = generateCSV([mockTransaction])
    expect(csv.startsWith("﻿")).toBe(true)
  })

  it("includes header row with all expected columns", () => {
    const csv = generateCSV([])
    const headerLine = csv.replace("﻿", "").split("\n")[0]
    expect(headerLine).toContain("ID")
    expect(headerLine).toContain("Type")
    expect(headerLine).toContain("Stock Item ID")
    expect(headerLine).toContain("SKU")
    expect(headerLine).toContain("Quantity")
    expect(headerLine).toContain("Batch ID")
    expect(headerLine).toContain("Created At")
  })

  it("generates correct data rows", () => {
    const csv = generateCSV([mockTransaction])
    const lines = csv.replace("﻿", "").split("\n")
    expect(lines.length).toBe(2) // header + 1 data row
    expect(lines[1]).toContain('"txn-001"')
    expect(lines[1]).toContain('"RECEIVE"')
    expect(lines[1]).toContain('"50"')
    expect(lines[1]).toContain('"CAB-001"')
    expect(lines[1]).toContain('"Cat6 Cable"')
  })

  it("handles multiple transactions", () => {
    const csv = generateCSV([mockTransaction, mockHandout])
    const lines = csv.replace("﻿", "").split("\n")
    expect(lines.length).toBe(3)
  })

  it("handles empty notes/reference as empty string", () => {
    const csv = generateCSV([mockHandout])
    const lines = csv.replace("﻿", "").split("\n")
    expect(lines[1]).toContain('""') // empty reference
  })
})

describe("generateSidecar", () => {
  it("produces valid sidecar with checksum", () => {
    const csv = generateCSV([mockTransaction])
    const sidecar = generateSidecar(csv, [mockTransaction], "daily", {
      from: new Date("2026-04-15T00:00:00Z"),
      to: new Date("2026-04-15T23:59:59.999Z"),
    })

    expect(sidecar.version).toBe(1)
    expect(sidecar.period).toBe("daily")
    expect(sidecar.rowCount).toBe(1)
    expect(sidecar.checksumAlgorithm).toBe("sha256")
    expect(sidecar.csvChecksum).toMatch(/^[a-f0-9]{64}$/)
    expect(sidecar.dateRange.from).toBe("2026-04-15T00:00:00.000Z")
  })

  it("checksum changes when CSV content changes", () => {
    const csv1 = generateCSV([mockTransaction])
    const csv2 = generateCSV([mockTransaction, mockHandout])
    const range = { from: new Date("2026-04-15T00:00:00Z"), to: new Date("2026-04-15T23:59:59.999Z") }

    const sidecar1 = generateSidecar(csv1, [mockTransaction], "daily", range)
    const sidecar2 = generateSidecar(csv2, [mockTransaction, mockHandout], "daily", range)

    expect(sidecar1.csvChecksum).not.toBe(sidecar2.csvChecksum)
  })

  it("includes entity lookup table", () => {
    const csv = generateCSV([mockTransaction, mockHandout])
    const sidecar = generateSidecar(csv, [mockTransaction, mockHandout], "daily", {
      from: new Date("2026-04-15T00:00:00Z"),
      to: new Date("2026-04-16T23:59:59.999Z"),
    })

    expect(sidecar.entityLookup.users["user-001"]).toBe("admin")
    expect(sidecar.entityLookup.users["user-002"]).toBe("operator1")
    expect(sidecar.entityLookup.stockItems["item-001"]).toBe("CAB-001 - Cat6 Cable")
    expect(sidecar.entityLookup.warehouses["wh-001"]).toBe("WH1 - Main Warehouse")
    expect(sidecar.entityLookup.dataHalls["dh-001"]).toBe("DH1 - Data Hall Alpha")
  })
})

describe("buildEntityLookup", () => {
  it("collects all unique entities from transactions", () => {
    const lookup = buildEntityLookup([mockTransaction, mockHandout])

    expect(Object.keys(lookup.users)).toHaveLength(2)
    expect(Object.keys(lookup.stockItems)).toHaveLength(1)
    expect(Object.keys(lookup.warehouses)).toHaveLength(1)
    expect(Object.keys(lookup.dataHalls)).toHaveLength(1)
    expect(Object.keys(lookup.rows)).toHaveLength(1)
    expect(Object.keys(lookup.racks)).toHaveLength(1)
  })

  it("skips null foreign keys", () => {
    const lookup = buildEntityLookup([mockTransaction])
    expect(Object.keys(lookup.dataHalls)).toHaveLength(0)
    expect(Object.keys(lookup.rows)).toHaveLength(0)
    expect(Object.keys(lookup.racks)).toHaveLength(0)
  })
})
