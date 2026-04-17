import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { validateTransferInput } from "@/lib/stock"

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const userId = (session.user as { id?: string }).id!
    const body = await req.json()

    const validation = validateTransferInput(body)
    if (!validation.valid) {
      return NextResponse.json({ error: (validation as { error: string }).error }, { status: 400 })
    }

    const items = body.items as {
      stockItemId: string
      quantity: number
      sourceWarehouseId: string
      destinationWarehouseId: string
    }[]

    const warehouseIds = new Set<string>()
    const stockItemIds = new Set<string>()
    for (const item of items) {
      warehouseIds.add(item.sourceWarehouseId)
      warehouseIds.add(item.destinationWarehouseId)
      stockItemIds.add(item.stockItemId)
    }

    const warehouses = await prisma.warehouse.findMany({
      where: { id: { in: [...warehouseIds] } },
      select: { id: true, name: true, isActive: true },
    })
    const stockItems = await prisma.stockItem.findMany({
      where: { id: { in: [...stockItemIds] } },
      select: { id: true, name: true, sku: true, isActive: true },
    })

    const warehouseMap = new Map(warehouses.map((w) => [w.id, w]))
    const stockItemMap = new Map(stockItems.map((s) => [s.id, s]))

    for (const item of items) {
      const stockItem = stockItemMap.get(item.stockItemId)
      if (!stockItem) {
        return NextResponse.json({ error: `Stock item ${item.stockItemId} not found` }, { status: 400 })
      }
      if (!stockItem.isActive) {
        return NextResponse.json({ error: `${stockItem.name} is inactive` }, { status: 400 })
      }

      const srcWh = warehouseMap.get(item.sourceWarehouseId)
      if (!srcWh) {
        return NextResponse.json({ error: `Source warehouse ${item.sourceWarehouseId} not found` }, { status: 400 })
      }
      if (!srcWh.isActive) {
        return NextResponse.json({ error: `Source warehouse ${srcWh.name} is inactive` }, { status: 400 })
      }

      const dstWh = warehouseMap.get(item.destinationWarehouseId)
      if (!dstWh) {
        return NextResponse.json({ error: `Destination warehouse ${item.destinationWarehouseId} not found` }, { status: 400 })
      }
      if (!dstWh.isActive) {
        return NextResponse.json({ error: `Destination warehouse ${dstWh.name} is inactive` }, { status: 400 })
      }
    }

    const batchId = randomUUID()
    const { notes, reference } = body

    const result = await prisma.$transaction(async (tx) => {
      const transactions = []

      for (const item of items) {
        const qty = parseInt(String(item.quantity))
        const stockItem = stockItemMap.get(item.stockItemId)!

        const sourceBalance = await tx.stockBalance.findUnique({
          where: {
            stockItemId_warehouseId: {
              stockItemId: item.stockItemId,
              warehouseId: item.sourceWarehouseId,
            },
          },
        })

        const availableQty = sourceBalance?.quantity ?? 0
        if (qty > availableQty) {
          throw new Error(
            `Insufficient stock for ${stockItem.name} at ${warehouseMap.get(item.sourceWarehouseId)!.name}. Available: ${availableQty}`
          )
        }

        await tx.stockBalance.upsert({
          where: {
            stockItemId_warehouseId: {
              stockItemId: item.stockItemId,
              warehouseId: item.sourceWarehouseId,
            },
          },
          update: { quantity: { decrement: qty } },
          create: {
            stockItemId: item.stockItemId,
            warehouseId: item.sourceWarehouseId,
            quantity: -qty,
          },
        })

        await tx.stockBalance.upsert({
          where: {
            stockItemId_warehouseId: {
              stockItemId: item.stockItemId,
              warehouseId: item.destinationWarehouseId,
            },
          },
          update: { quantity: { increment: qty } },
          create: {
            stockItemId: item.stockItemId,
            warehouseId: item.destinationWarehouseId,
            quantity: qty,
          },
        })

        const transaction = await tx.transaction.create({
          data: {
            type: "TRANSFER",
            stockItemId: item.stockItemId,
            quantity: qty,
            userId,
            sourceWarehouseId: item.sourceWarehouseId,
            destinationWarehouseId: item.destinationWarehouseId,
            notes: notes || null,
            reference: reference || null,
            batchId,
          },
          include: {
            stockItem: { select: { id: true, sku: true, name: true, unit: true } },
            user: { select: { id: true, username: true } },
            sourceWarehouse: { select: { id: true, name: true, code: true } },
            destinationWarehouse: { select: { id: true, name: true, code: true } },
          },
        })

        transactions.push(transaction)
      }

      return transactions
    })

    return NextResponse.json({ transactions: result, batchId }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error"
    if (message.startsWith("Insufficient stock")) {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    console.error("/api/transfers POST error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
