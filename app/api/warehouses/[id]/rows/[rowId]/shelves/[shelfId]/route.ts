import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; rowId: string; shelfId: string }> }) {
  const session = await auth()
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { shelfId } = await params
  const shelf = await prisma.shelf.findUnique({
    where: { id: shelfId },
    include: { warehouseRow: true },
  })
  if (!shelf) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const itemsWithStock = await prisma.stockItem.findMany({
    where: {
      shelfId,
      isActive: true,
      stockBalances: {
        some: { warehouseId: shelf.warehouseRow.warehouseId, quantity: { gt: 0 } },
      },
    },
    select: {
      name: true,
      stockBalances: {
        where: { warehouseId: shelf.warehouseRow.warehouseId, quantity: { gt: 0 } },
        select: { quantity: true },
      },
    },
  })
  if (itemsWithStock.length > 0) {
    const totalQty = itemsWithStock.reduce((sum, i) => sum + i.stockBalances.reduce((s, b) => s + b.quantity, 0), 0)
    return NextResponse.json(
      { error: `Cannot remove this shelf — it has ${itemsWithStock.length} item(s) totaling ${totalQty} units in stock` },
      { status: 409 }
    )
  }

  await prisma.shelf.update({ where: { id: shelfId }, data: { isActive: false } })
  return NextResponse.json({ deactivated: true })
}
