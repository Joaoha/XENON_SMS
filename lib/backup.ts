import { prisma } from "@/lib/db"
import { createHash } from "crypto"
import { existsSync, mkdirSync, writeFileSync } from "fs"
import { join } from "path"

export type BackupPeriod = "daily" | "weekly" | "monthly" | "full"

interface BackupResult {
  csvPath: string
  metaPath: string
  rowCount: number
  period: BackupPeriod
  dateRange: { from: Date; to: Date }
}

interface TransactionRow {
  id: string
  type: string
  stockItemId: string
  quantity: number
  userId: string
  pickedBy: string | null
  dataHallId: string | null
  rowId: string | null
  rackId: string | null
  sourceWarehouseId: string | null
  destinationWarehouseId: string | null
  notes: string | null
  reference: string | null
  batchId: string | null
  createdAt: Date
  stockItem: { sku: string; name: string; unit: string }
  user: { username: string }
  dataHall: { code: string; name: string } | null
  row: { name: string } | null
  rack: { name: string } | null
  sourceWarehouse: { code: string; name: string } | null
  destinationWarehouse: { code: string; name: string } | null
}

function getBackupDir(): string {
  return process.env.BACKUP_DIR || "./backups"
}

function getDateRange(period: BackupPeriod, referenceDate?: Date): { from: Date; to: Date } {
  const now = referenceDate || new Date()

  if (period === "full") {
    return { from: new Date(0), to: now }
  }

  if (period === "daily") {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
    to.setMilliseconds(-1)
    return { from, to }
  }

  if (period === "weekly") {
    const dayOfWeek = now.getUTCDay()
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const lastMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - mondayOffset - 7))
    const lastSunday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - mondayOffset))
    lastSunday.setMilliseconds(-1)
    return { from: lastMonday, to: lastSunday }
  }

  // monthly
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  to.setMilliseconds(-1)
  return { from, to }
}

function getFilename(period: BackupPeriod, dateRange: { from: Date; to: Date }): string {
  if (period === "full") {
    return `xenon-txn-full-${dateRange.to.toISOString().slice(0, 10)}`
  }
  if (period === "daily") {
    return `xenon-txn-${dateRange.from.toISOString().slice(0, 10)}`
  }
  if (period === "weekly") {
    const year = dateRange.from.getUTCFullYear()
    const janFirst = new Date(Date.UTC(year, 0, 1))
    const days = Math.floor((dateRange.from.getTime() - janFirst.getTime()) / 86400000)
    const week = Math.ceil((days + janFirst.getUTCDay() + 1) / 7)
    return `xenon-txn-week-${year}-W${String(week).padStart(2, "0")}`
  }
  // monthly
  return `xenon-txn-${dateRange.from.toISOString().slice(0, 7)}`
}

function escapeCSV(value: string): string {
  if (/^[=+\-@]/.test(value)) {
    value = "'" + value
  }
  return `"${value.replace(/"/g, '""')}"`
}

function generateCSV(transactions: TransactionRow[]): string {
  const BOM = "﻿"
  const headers = [
    "ID", "Type", "Stock Item ID", "SKU", "Item Name", "Unit",
    "Quantity", "User ID", "Recorded By", "Picked By",
    "Data Hall ID", "Data Hall", "Row ID", "Row", "Rack ID", "Rack",
    "Source Warehouse ID", "Source Warehouse",
    "Destination Warehouse ID", "Destination Warehouse",
    "Notes", "Reference", "Batch ID", "Created At",
  ]

  const rows = transactions.map((t) => [
    t.id,
    t.type,
    t.stockItemId,
    t.stockItem.sku,
    t.stockItem.name,
    t.stockItem.unit,
    String(t.quantity),
    t.userId,
    t.user.username,
    t.pickedBy || "",
    t.dataHallId || "",
    t.dataHall ? `${t.dataHall.code} - ${t.dataHall.name}` : "",
    t.rowId || "",
    t.row?.name || "",
    t.rackId || "",
    t.rack?.name || "",
    t.sourceWarehouseId || "",
    t.sourceWarehouse ? `${t.sourceWarehouse.code} - ${t.sourceWarehouse.name}` : "",
    t.destinationWarehouseId || "",
    t.destinationWarehouse ? `${t.destinationWarehouse.code} - ${t.destinationWarehouse.name}` : "",
    t.notes || "",
    t.reference || "",
    t.batchId || "",
    t.createdAt.toISOString(),
  ])

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCSV(cell)).join(","))
    .join("\n")

  return BOM + csvContent
}

interface EntityLookup {
  users: Record<string, string>
  stockItems: Record<string, string>
  dataHalls: Record<string, string>
  rows: Record<string, string>
  racks: Record<string, string>
  warehouses: Record<string, string>
}

function buildEntityLookup(transactions: TransactionRow[]): EntityLookup {
  const lookup: EntityLookup = {
    users: {},
    stockItems: {},
    dataHalls: {},
    rows: {},
    racks: {},
    warehouses: {},
  }

  for (const t of transactions) {
    lookup.users[t.userId] = t.user.username
    lookup.stockItems[t.stockItemId] = `${t.stockItem.sku} - ${t.stockItem.name}`
    if (t.dataHallId && t.dataHall) lookup.dataHalls[t.dataHallId] = `${t.dataHall.code} - ${t.dataHall.name}`
    if (t.rowId && t.row) lookup.rows[t.rowId] = t.row.name
    if (t.rackId && t.rack) lookup.racks[t.rackId] = t.rack.name
    if (t.sourceWarehouseId && t.sourceWarehouse) lookup.warehouses[t.sourceWarehouseId] = `${t.sourceWarehouse.code} - ${t.sourceWarehouse.name}`
    if (t.destinationWarehouseId && t.destinationWarehouse) lookup.warehouses[t.destinationWarehouseId] = `${t.destinationWarehouse.code} - ${t.destinationWarehouse.name}`
  }

  return lookup
}

function generateSidecar(csv: string, transactions: TransactionRow[], period: BackupPeriod, dateRange: { from: Date; to: Date }) {
  const checksum = createHash("sha256").update(csv, "utf8").digest("hex")
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    period,
    dateRange: { from: dateRange.from.toISOString(), to: dateRange.to.toISOString() },
    rowCount: transactions.length,
    csvChecksum: checksum,
    checksumAlgorithm: "sha256",
    entityLookup: buildEntityLookup(transactions),
  }
}

export async function createBackup(period: BackupPeriod, referenceDate?: Date): Promise<BackupResult> {
  const dateRange = getDateRange(period, referenceDate)

  const transactions = await prisma.transaction.findMany({
    where: {
      deletedAt: null,
      createdAt: { gte: dateRange.from, lte: dateRange.to },
    },
    orderBy: { createdAt: "asc" },
    include: {
      stockItem: { select: { sku: true, name: true, unit: true } },
      user: { select: { username: true } },
      dataHall: { select: { code: true, name: true } },
      row: { select: { name: true } },
      rack: { select: { name: true } },
      sourceWarehouse: { select: { code: true, name: true } },
      destinationWarehouse: { select: { code: true, name: true } },
    },
  }) as unknown as TransactionRow[]

  const csv = generateCSV(transactions)
  const sidecar = generateSidecar(csv, transactions, period, dateRange)

  const backupDir = getBackupDir()
  const periodDir = join(backupDir, period)
  if (!existsSync(periodDir)) mkdirSync(periodDir, { recursive: true })

  const filename = getFilename(period, dateRange)
  const csvPath = join(periodDir, `${filename}.csv`)
  const metaPath = join(periodDir, `${filename}.meta.json`)

  writeFileSync(csvPath, csv, "utf8")
  writeFileSync(metaPath, JSON.stringify(sidecar, null, 2), "utf8")

  return { csvPath, metaPath, rowCount: transactions.length, period, dateRange }
}

export { getDateRange, generateCSV, generateSidecar, escapeCSV, buildEntityLookup }
export type { TransactionRow, EntityLookup }
