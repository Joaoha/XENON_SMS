import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { computeBalance, validateTransactionInput } from "@/lib/stock"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const itemId = searchParams.get("itemId")
    const type = searchParams.get("type")
    const pickedBy = searchParams.get("pickedBy")
    const dataHallId = searchParams.get("dataHallId")
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")

    const sourceWarehouseId = searchParams.get("sourceWarehouseId")
    const destinationWarehouseId = searchParams.get("destinationWarehouseId")
    const warehouseId = searchParams.get("warehouseId")

    const where: Record<string, unknown> = {}
    if (itemId) where.stockItemId = itemId
    if (type) where.type = type
    if (pickedBy) where.pickedBy = { contains: pickedBy, mode: "insensitive" }
    if (dataHallId) where.dataHallId = dataHallId
    if (sourceWarehouseId) where.sourceWarehouseId = sourceWarehouseId
    if (destinationWarehouseId) where.destinationWarehouseId = destinationWarehouseId
    if (warehouseId) {
      where.OR = [
        { sourceWarehouseId: warehouseId },
        { destinationWarehouseId: warehouseId },
      ]
    }
    if (from || to) {
      where.createdAt = {}
      if (from) (where.createdAt as Record<string, Date>).gte = new Date(from)
      if (to) {
        const toDate = new Date(to)
        toDate.setHours(23, 59, 59, 999)
        ;(where.createdAt as Record<string, Date>).lte = toDate
      }
    }

    const total = await prisma.transaction.count({ where })
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        stockItem: { select: { id: true, sku: true, name: true, unit: true } },
        user: { select: { id: true, username: true } },
        dataHall: { select: { id: true, code: true, name: true } },
        row: { select: { id: true, name: true } },
        rack: { select: { id: true, name: true } },
        sourceWarehouse: { select: { id: true, name: true, code: true } },
        destinationWarehouse: { select: { id: true, name: true, code: true } },
        deletedByUser: { select: { id: true, username: true } },
      },
    })

    return NextResponse.json({ transactions, total, page, limit })
  } catch (err) {
    console.error("/api/transactions GET error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const userId = (session.user as { id?: string }).id!
    const body = await req.json()
    const { type, pickedBy, dataHallId, rowId, rackId, notes, reference, sourceWarehouseId, destinationWarehouseId } = body

    const txInclude = {
      stockItem: { select: { id: true, sku: true, name: true, unit: true } },
      user: { select: { id: true, username: true } },
      dataHall: { select: { id: true, code: true, name: true } },
      row: { select: { id: true, name: true } },
      rack: { select: { id: true, name: true } },
      sourceWarehouse: { select: { id: true, name: true, code: true } },
      destinationWarehouse: { select: { id: true, name: true, code: true } },
    }

    const itemsList: { stockItemId: string; quantity: number }[] = body.items
      ? body.items
      : [{ stockItemId: body.stockItemId, quantity: body.quantity }]

    if (type === "HANDOUT") {
      const balances = new Map<string, number>()
      for (const item of itemsList) {
        if (!balances.has(item.stockItemId)) {
          if (sourceWarehouseId) {
            const sb = await prisma.stockBalance.findUnique({
              where: {
                stockItemId_warehouseId: {
                  stockItemId: item.stockItemId,
                  warehouseId: sourceWarehouseId,
                },
              },
            })
            balances.set(item.stockItemId, sb?.quantity ?? 0)
          } else {
            balances.set(item.stockItemId, await getBalance(item.stockItemId))
          }
        }
      }

      for (const item of itemsList) {
        const validation = validateTransactionInput(
          { type, stockItemId: item.stockItemId, quantity: item.quantity, pickedBy, dataHallId, rowId, rackId },
          balances.get(item.stockItemId)
        )
        if (!validation.valid) {
          const stockItem = await prisma.stockItem.findUnique({
            where: { id: item.stockItemId },
            select: { name: true },
          })
          const label = stockItem?.name || item.stockItemId
          return NextResponse.json(
            { error: `${label}: ${(validation as { error: string }).error}` },
            { status: 400 }
          )
        }
      }

      const batchId = randomUUID()

      const transactions = await prisma.$transaction(async (tx) => {
        const results = []
        for (const item of itemsList) {
          const qty = parseInt(String(item.quantity))

          if (sourceWarehouseId) {
            await tx.stockBalance.upsert({
              where: {
                stockItemId_warehouseId: {
                  stockItemId: item.stockItemId,
                  warehouseId: sourceWarehouseId,
                },
              },
              update: { quantity: { decrement: qty } },
              create: {
                stockItemId: item.stockItemId,
                warehouseId: sourceWarehouseId,
                quantity: -qty,
              },
            })
          }

          const transaction = await tx.transaction.create({
            data: {
              type,
              stockItemId: item.stockItemId,
              quantity: qty,
              userId,
              pickedBy,
              dataHallId,
              rowId,
              rackId,
              sourceWarehouseId: sourceWarehouseId || null,
              notes,
              reference,
              batchId,
            },
            include: txInclude,
          })
          results.push(transaction)
        }
        return results
      })

      return NextResponse.json(
        { transactions, batchId },
        { status: 201 }
      )
    }

    const validation = validateTransactionInput(body)
    if (!validation.valid) {
      return NextResponse.json({ error: (validation as { error: string }).error }, { status: 400 })
    }

    const qty = parseInt(String(itemsList[0].quantity))

    const transaction = await prisma.$transaction(async (tx) => {
      if (destinationWarehouseId) {
        await tx.stockBalance.upsert({
          where: {
            stockItemId_warehouseId: {
              stockItemId: itemsList[0].stockItemId,
              warehouseId: destinationWarehouseId,
            },
          },
          update: { quantity: { increment: qty } },
          create: {
            stockItemId: itemsList[0].stockItemId,
            warehouseId: destinationWarehouseId,
            quantity: qty,
          },
        })
      }

      return tx.transaction.create({
        data: {
          type,
          stockItemId: itemsList[0].stockItemId,
          quantity: qty,
          userId,
          pickedBy: null,
          dataHallId: dataHallId || null,
          rowId: rowId || null,
          rackId: rackId || null,
          destinationWarehouseId: destinationWarehouseId || null,
          notes,
          reference,
        },
        include: txInclude,
      })
    })

    return NextResponse.json(transaction, { status: 201 })
  } catch (err) {
    console.error("/api/transactions POST error:", err)
    console.error("/api/transactions POST error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function getBalance(stockItemId: string): Promise<number> {
  const result = await prisma.transaction.groupBy({
    by: ["type"],
    where: { stockItemId, deletedAt: null },
    _sum: { quantity: true },
  })
  return computeBalance(result)
}
