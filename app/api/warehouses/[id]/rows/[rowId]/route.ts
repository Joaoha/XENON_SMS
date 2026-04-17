import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; rowId: string }> }) {
  const session = await auth()
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id, rowId } = await params
  const row = await prisma.warehouseRow.findUnique({ where: { id: rowId } })
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const itemsWithStock = await prisma.stockItem.findMany({
    where: {
      warehouseRowId: rowId,
      isActive: true,
      stockBalances: {
        some: { warehouseId: id, quantity: { gt: 0 } },
      },
    },
    select: {
      name: true,
      stockBalances: {
        where: { warehouseId: id, quantity: { gt: 0 } },
        select: { quantity: true },
      },
    },
  })
  if (itemsWithStock.length > 0) {
    const totalQty = itemsWithStock.reduce((sum, i) => sum + i.stockBalances.reduce((s, b) => s + b.quantity, 0), 0)
    return NextResponse.json(
      { error: `Cannot remove this row — it has ${itemsWithStock.length} item(s) totaling ${totalQty} units in stock` },
      { status: 409 }
    )
  }

  await prisma.warehouseRow.update({ where: { id: rowId }, data: { isActive: false } })
  return NextResponse.json({ deactivated: true })
}
