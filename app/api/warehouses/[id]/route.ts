import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const warehouse = await prisma.warehouse.findUnique({ where: { id } })
  if (!warehouse) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const balances = await prisma.stockBalance.findMany({
    where: { warehouseId: id, quantity: { gt: 0 } },
    select: { quantity: true },
  })
  if (balances.length > 0) {
    const totalQty = balances.reduce((sum, b) => sum + b.quantity, 0)
    return NextResponse.json(
      { error: `Cannot remove this warehouse — it has ${balances.length} item(s) totaling ${totalQty} units in stock` },
      { status: 409 }
    )
  }

  await prisma.warehouse.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ deactivated: true })
}
