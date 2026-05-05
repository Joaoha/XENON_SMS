import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") || "all"
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const itemId = searchParams.get("itemId")
  const dataHallId = searchParams.get("dataHallId")

  const where: Record<string, unknown> = { deletedAt: null }
  if (type !== "all") where.type = type
  if (itemId) where.stockItemId = itemId
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

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      stockItem: { select: { sku: true, name: true, unit: true } },
      user: { select: { username: true } },
      dataHall: { select: { code: true, name: true } },
      row: { select: { name: true } },
      rack: { select: { name: true } },
    },
  })

  const headers = [
    "Date/Time",
    "Type",
    "SKU",
    "Item",
    "Unit",
    "Quantity",
    "Recorded By",
    "Picked By",
    "Data Hall",
    "Row",
    "Rack",
    "Reference",
    "Notes",
  ]

  const rows = transactions.map((t) => [
    t.createdAt.toISOString(),
    t.type,
    t.stockItem.sku,
    t.stockItem.name,
    t.stockItem.unit,
    t.quantity,
    t.user.username,
    t.pickedBy || "",
    t.dataHall?.code || "",
    t.row?.name || "",
    t.rack?.name || "",
    t.reference || "",
    t.notes || "",
  ])

  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n")

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="xenon-transactions-${Date.now()}.csv"`,
    },
  })
}
