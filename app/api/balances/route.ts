import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { computeBalance } from "@/lib/stock"

interface LocationBalance {
  warehouseId: string
  warehouseName: string
  warehouseCode: string
  warehouseRowId: string | null
  warehouseRowName: string | null
  shelfId: string | null
  shelfName: string | null
  balance: number
}

function locationKey(whId: string, rowId: string | null, shelfId: string | null) {
  return `${whId}:${rowId ?? ""}:${shelfId ?? ""}`
}

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") || ""
    const warehouseId = searchParams.get("warehouseId")

    const items = await prisma.stockItem.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { sku: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
        warehouseRow: { select: { id: true, name: true } },
        shelf: { select: { id: true, name: true } },
      },
    })

    const itemIds = items.map((i) => i.id)

    const transactionGroups = await prisma.transaction.groupBy({
      by: ["stockItemId", "type"],
      where: { stockItemId: { in: itemIds }, deletedAt: null },
      _sum: { quantity: true },
    })

    const allTransactions = await prisma.transaction.findMany({
      where: { stockItemId: { in: itemIds }, deletedAt: null },
      select: {
        stockItemId: true,
        type: true,
        quantity: true,
        sourceWarehouseId: true,
        sourceWarehouseRowId: true,
        sourceShelfId: true,
        destinationWarehouseId: true,
        destinationWarehouseRowId: true,
        destinationShelfId: true,
        sourceWarehouse: { select: { id: true, name: true, code: true } },
        sourceWarehouseRow: { select: { id: true, name: true } },
        sourceShelf: { select: { id: true, name: true } },
        destinationWarehouse: { select: { id: true, name: true, code: true } },
        destinationWarehouseRow: { select: { id: true, name: true } },
        destinationShelf: { select: { id: true, name: true } },
      },
    })

    const txByItem = new Map<string, { received: number; handedOut: number; balance: number }>()
    for (const itemId of itemIds) {
      const grouped = transactionGroups.filter((g) => g.stockItemId === itemId)
      let received = 0
      let handedOut = 0
      for (const r of grouped) {
        if (r.type === "RECEIVE") received = r._sum.quantity ?? 0
        if (r.type === "HANDOUT") handedOut = r._sum.quantity ?? 0
      }
      txByItem.set(itemId, { received, handedOut, balance: computeBalance(grouped) })
    }

    type LocMeta = { whName: string; whCode: string; rowName: string | null; shelfName: string | null }
    const locationsByItem = new Map<string, Map<string, { balance: number; meta: LocMeta }>>()

    for (const tx of allTransactions) {
      let locs = locationsByItem.get(tx.stockItemId)
      if (!locs) {
        locs = new Map()
        locationsByItem.set(tx.stockItemId, locs)
      }

      const applyDelta = (
        whId: string, whName: string, whCode: string,
        rowId: string | null, rowName: string | null,
        shelfId: string | null, shelfName: string | null,
        delta: number,
      ) => {
        const key = locationKey(whId, rowId, shelfId)
        const existing = locs!.get(key)
        if (existing) {
          existing.balance += delta
        } else {
          locs!.set(key, {
            balance: delta,
            meta: { whName, whCode, rowName, shelfName },
          })
        }
      }

      if (tx.type === "RECEIVE" && tx.destinationWarehouseId && tx.destinationWarehouse) {
        applyDelta(
          tx.destinationWarehouseId, tx.destinationWarehouse.name, tx.destinationWarehouse.code,
          tx.destinationWarehouseRowId, tx.destinationWarehouseRow?.name ?? null,
          tx.destinationShelfId, tx.destinationShelf?.name ?? null,
          tx.quantity,
        )
      } else if (tx.type === "HANDOUT" && tx.sourceWarehouseId && tx.sourceWarehouse) {
        applyDelta(
          tx.sourceWarehouseId, tx.sourceWarehouse.name, tx.sourceWarehouse.code,
          tx.sourceWarehouseRowId, tx.sourceWarehouseRow?.name ?? null,
          tx.sourceShelfId, tx.sourceShelf?.name ?? null,
          -tx.quantity,
        )
      } else if (tx.type === "TRANSFER") {
        if (tx.sourceWarehouseId && tx.sourceWarehouse) {
          applyDelta(
            tx.sourceWarehouseId, tx.sourceWarehouse.name, tx.sourceWarehouse.code,
            tx.sourceWarehouseRowId, tx.sourceWarehouseRow?.name ?? null,
            tx.sourceShelfId, tx.sourceShelf?.name ?? null,
            -tx.quantity,
          )
        }
        if (tx.destinationWarehouseId && tx.destinationWarehouse) {
          applyDelta(
            tx.destinationWarehouseId, tx.destinationWarehouse.name, tx.destinationWarehouse.code,
            tx.destinationWarehouseRowId, tx.destinationWarehouseRow?.name ?? null,
            tx.destinationShelfId, tx.destinationShelf?.name ?? null,
            tx.quantity,
          )
        }
      }
    }

    const balances = items.map((item) => {
      const tx = txByItem.get(item.id) || { received: 0, handedOut: 0, balance: 0 }
      const locs = locationsByItem.get(item.id)

      const byLocation: LocationBalance[] = []
      if (locs) {
        for (const [key, entry] of locs) {
          if (entry.balance === 0) continue
          if (warehouseId && !key.startsWith(warehouseId + ":")) continue
          const [whId, rowId, shelfId] = key.split(":")
          byLocation.push({
            warehouseId: whId,
            warehouseName: entry.meta.whName,
            warehouseCode: entry.meta.whCode,
            warehouseRowId: rowId || null,
            warehouseRowName: entry.meta.rowName,
            shelfId: shelfId || null,
            shelfName: entry.meta.shelfName,
            balance: entry.balance,
          })
        }
      }
      byLocation.sort((a, b) => {
        const wh = a.warehouseCode.localeCompare(b.warehouseCode)
        if (wh !== 0) return wh
        const row = (a.warehouseRowName ?? "").localeCompare(b.warehouseRowName ?? "")
        if (row !== 0) return row
        return (a.shelfName ?? "").localeCompare(b.shelfName ?? "")
      })

      const totalBalance = warehouseId
        ? byLocation.reduce((sum, l) => sum + l.balance, 0)
        : tx.balance

      const nonZeroLocations = byLocation.filter((l) => l.balance !== 0)
      let location: string | null = null
      if (nonZeroLocations.length === 1) {
        const l = nonZeroLocations[0]
        location = [l.warehouseCode, l.warehouseRowName, l.shelfName].filter(Boolean).join(" / ")
      } else if (nonZeroLocations.length > 1) {
        location = `Multiple (${nonZeroLocations.length})`
      }

      return {
        id: item.id,
        sku: item.sku,
        name: item.name,
        unit: item.unit,
        description: item.description,
        location,
        balance: totalBalance,
        received: tx.received,
        handedOut: tx.handedOut,
        byWarehouse: byLocation.map((l) => ({
          warehouseId: l.warehouseId,
          warehouseName: l.warehouseName,
          warehouseCode: l.warehouseCode,
          balance: l.balance,
        })),
        byLocation,
      }
    })

    return NextResponse.json(balances)
  } catch (err) {
    console.error("/api/balances error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
