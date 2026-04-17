import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { batchId } = await params

  const transactions = await prisma.transaction.findMany({
    where: { batchId },
    orderBy: { createdAt: "asc" },
    include: {
      stockItem: {
        select: {
          id: true, sku: true, name: true, unit: true,
          warehouse: { select: { code: true, name: true } },
          warehouseRow: { select: { name: true } },
          shelf: { select: { name: true } },
        },
      },
      user: { select: { id: true, username: true } },
      dataHall: { select: { id: true, code: true, name: true } },
      row: { select: { id: true, name: true } },
      rack: { select: { id: true, name: true } },
      sourceWarehouse: { select: { id: true, code: true, name: true } },
    },
  })

  if (transactions.length === 0) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 })
  }

  return NextResponse.json({ transactions, batchId })
}
