import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { computeBalance, validateTransactionInput } from "@/lib/stock"

export async function GET(req: Request) {
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

  const where: Record<string, unknown> = {}
  if (itemId) where.stockItemId = itemId
  if (type) where.type = type
  if (pickedBy) where.pickedBy = { contains: pickedBy, mode: "insensitive" }
  if (dataHallId) where.dataHallId = dataHallId
  if (from || to) {
    where.createdAt = {}
    if (from) (where.createdAt as Record<string, Date>).gte = new Date(from)
    if (to) {
      const toDate = new Date(to)
      toDate.setHours(23, 59, 59, 999)
      ;(where.createdAt as Record<string, Date>).lte = toDate
    }
  }

  const [total, transactions] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        stockItem: { select: { id: true, sku: true, name: true, unit: true } },
        user: { select: { id: true, username: true } },
        dataHall: { select: { id: true, code: true, name: true } },
        row: { select: { id: true, code: true, name: true } },
        rack: { select: { id: true, code: true, name: true } },
        deletedByUser: { select: { id: true, username: true } },
      },
    }),
  ])

  return NextResponse.json({ transactions, total, page, limit })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as { id?: string }).id!
  const body = await req.json()
  const { type, stockItemId, quantity, pickedBy, dataHallId, rowId, rackId, notes, reference } =
    body

  const currentBalance =
    type === "HANDOUT" && stockItemId ? await getBalance(stockItemId) : undefined

  const validation = validateTransactionInput(body, currentBalance)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const transaction = await prisma.transaction.create({
    data: {
      type,
      stockItemId,
      quantity: parseInt(quantity),
      userId,
      pickedBy: type === "HANDOUT" ? pickedBy : null,
      dataHallId: type === "HANDOUT" ? dataHallId : null,
      rowId: type === "HANDOUT" ? rowId : null,
      rackId: type === "HANDOUT" ? rackId : null,
      notes,
      reference,
    },
    include: {
      stockItem: { select: { id: true, sku: true, name: true, unit: true } },
      user: { select: { id: true, username: true } },
      dataHall: { select: { id: true, code: true, name: true } },
      row: { select: { id: true, code: true, name: true } },
      rack: { select: { id: true, code: true, name: true } },
    },
  })
  return NextResponse.json(transaction, { status: 201 })
}

async function getBalance(stockItemId: string): Promise<number> {
  const result = await prisma.transaction.groupBy({
    by: ["type"],
    where: { stockItemId, deletedAt: null },
    _sum: { quantity: true },
  })
  return computeBalance(result)
}
