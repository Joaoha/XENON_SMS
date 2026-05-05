import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { createHash } from "crypto"
import type { PrismaClient } from "@prisma/client"

interface SidecarData {
  version: number
  rowCount: number
  csvChecksum: string
  checksumAlgorithm: string
  entityLookup: {
    users: Record<string, string>
    stockItems: Record<string, string>
    dataHalls: Record<string, string>
    rows: Record<string, string>
    racks: Record<string, string>
    warehouses: Record<string, string>
  }
}

interface RestoreResult {
  inserted: number
  restored: number
  skipped: number
  errors: string[]
}

function parseCSV(csvContent: string): string[][] {
  const content = csvContent.replace(/^﻿/, "")
  const lines = content.split("\n").filter((l) => l.trim())
  return lines.map((line) => {
    const cells: string[] = []
    let current = ""
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"'
          i++
        } else if (ch === '"') {
          inQuotes = false
        } else {
          current += ch
        }
      } else {
        if (ch === '"') {
          inQuotes = true
        } else if (ch === ",") {
          cells.push(current)
          current = ""
        } else {
          current += ch
        }
      }
    }
    cells.push(current)
    return cells.map((c) => (c.startsWith("'") && /^'[=+\-@]/.test(c) ? c.slice(1) : c))
  })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = session.user as { role?: string; id?: string }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const formData = await req.formData()
  const csvFile = formData.get("csv") as File | null
  const metaFile = formData.get("meta") as File | null

  if (!csvFile || !metaFile) {
    return NextResponse.json(
      { error: "Both csv and meta files are required" },
      { status: 400 }
    )
  }

  const csvContent = await csvFile.text()
  const metaContent = await metaFile.text()

  let sidecar: SidecarData
  try {
    sidecar = JSON.parse(metaContent)
  } catch {
    return NextResponse.json({ error: "Invalid meta.json file" }, { status: 400 })
  }

  const checksum = createHash("sha256").update(csvContent, "utf8").digest("hex")
  if (checksum !== sidecar.csvChecksum) {
    return NextResponse.json(
      { error: "CSV checksum mismatch — file may be corrupted" },
      { status: 400 }
    )
  }

  const rows = parseCSV(csvContent)
  if (rows.length < 2) {
    return NextResponse.json({ error: "CSV has no data rows" }, { status: 400 })
  }

  const headers = rows[0]
  const idIdx = headers.indexOf("ID")
  const typeIdx = headers.indexOf("Type")
  const stockItemIdIdx = headers.indexOf("Stock Item ID")
  const quantityIdx = headers.indexOf("Quantity")
  const userIdIdx = headers.indexOf("User ID")
  const pickedByIdx = headers.indexOf("Picked By")
  const dataHallIdIdx = headers.indexOf("Data Hall ID")
  const rowIdIdx = headers.indexOf("Row ID")
  const rackIdIdx = headers.indexOf("Rack ID")
  const sourceWarehouseIdIdx = headers.indexOf("Source Warehouse ID")
  const destWarehouseIdIdx = headers.indexOf("Destination Warehouse ID")
  const notesIdx = headers.indexOf("Notes")
  const referenceIdx = headers.indexOf("Reference")
  const batchIdIdx = headers.indexOf("Batch ID")
  const createdAtIdx = headers.indexOf("Created At")

  if (idIdx === -1 || typeIdx === -1 || stockItemIdIdx === -1 || quantityIdx === -1 || userIdIdx === -1) {
    return NextResponse.json(
      { error: "CSV missing required columns: ID, Type, Stock Item ID, Quantity, User ID" },
      { status: 400 }
    )
  }

  const result: RestoreResult = { inserted: 0, restored: 0, skipped: 0, errors: [] }
  const affectedItems = new Set<string>()
  const dataRows = rows.slice(1)

  const BATCH_SIZE = 500
  for (let i = 0; i < dataRows.length; i += BATCH_SIZE) {
    const batch = dataRows.slice(i, i + BATCH_SIZE)

    await prisma.$transaction(async (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => {
      for (const row of batch) {
        const id = row[idIdx]
        const stockItemId = row[stockItemIdIdx]

        if (!id) {
          result.errors.push(`Row ${i + result.inserted + result.restored + result.skipped + 1}: missing ID`)
          continue
        }

        const existing = await tx.transaction.findUnique({ where: { id } })

        if (existing && !existing.deletedAt) {
          result.skipped++
          continue
        }

        if (existing && existing.deletedAt) {
          await tx.transaction.update({
            where: { id },
            data: { deletedAt: null, deletedBy: null },
          })
          affectedItems.add(existing.stockItemId)
          result.restored++
          continue
        }

        const stockItemExists = await tx.stockItem.findUnique({ where: { id: stockItemId } })
        if (!stockItemExists) {
          result.errors.push(`Row ${i + batch.indexOf(row) + 2}: stock item ${stockItemId} not found`)
          continue
        }

        const userExists = await tx.user.findUnique({ where: { id: row[userIdIdx] } })
        if (!userExists) {
          result.errors.push(`Row ${i + batch.indexOf(row) + 2}: user ${row[userIdIdx]} not found`)
          continue
        }

        await tx.transaction.create({
          data: {
            id,
            type: row[typeIdx] as "RECEIVE" | "HANDOUT" | "TRANSFER",
            stockItemId,
            quantity: parseInt(row[quantityIdx], 10),
            userId: row[userIdIdx],
            pickedBy: row[pickedByIdx] || null,
            dataHallId: row[dataHallIdIdx] || null,
            rowId: row[rowIdIdx] || null,
            rackId: row[rackIdIdx] || null,
            sourceWarehouseId: row[sourceWarehouseIdIdx] || null,
            destinationWarehouseId: row[destWarehouseIdIdx] || null,
            notes: row[notesIdx] || null,
            reference: row[referenceIdx] || null,
            batchId: row[batchIdIdx] || null,
            createdAt: new Date(row[createdAtIdx]),
          },
        })

        affectedItems.add(stockItemId)
        result.inserted++
      }
    })
  }

  for (const stockItemId of Array.from(affectedItems)) {
    const balances = await prisma.transaction.groupBy({
      by: ["sourceWarehouseId", "destinationWarehouseId", "type"],
      where: { stockItemId, deletedAt: null },
      _sum: { quantity: true },
    })

    const warehouseBalances = new Map<string, number>()

    for (const b of balances) {
      const qty = b._sum.quantity ?? 0
      if (b.type === "RECEIVE" && b.destinationWarehouseId) {
        warehouseBalances.set(
          b.destinationWarehouseId,
          (warehouseBalances.get(b.destinationWarehouseId) || 0) + qty
        )
      } else if (b.type === "HANDOUT" && b.sourceWarehouseId) {
        warehouseBalances.set(
          b.sourceWarehouseId,
          (warehouseBalances.get(b.sourceWarehouseId) || 0) - qty
        )
      } else if (b.type === "TRANSFER") {
        if (b.sourceWarehouseId) {
          warehouseBalances.set(
            b.sourceWarehouseId,
            (warehouseBalances.get(b.sourceWarehouseId) || 0) - qty
          )
        }
        if (b.destinationWarehouseId) {
          warehouseBalances.set(
            b.destinationWarehouseId,
            (warehouseBalances.get(b.destinationWarehouseId) || 0) + qty
          )
        }
      }
    }

    for (const [warehouseId, quantity] of Array.from(warehouseBalances)) {
      await prisma.stockBalance.upsert({
        where: { stockItemId_warehouseId: { stockItemId, warehouseId } },
        update: { quantity },
        create: { stockItemId, warehouseId, quantity },
      })
    }
  }

  return NextResponse.json({
    success: true,
    inserted: result.inserted,
    restored: result.restored,
    skipped: result.skipped,
    errors: result.errors,
    affectedItems: affectedItems.size,
  })
}
