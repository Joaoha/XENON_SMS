import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const items = await prisma.stockItem.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      warehouse: { select: { id: true, code: true, name: true } },
      warehouseRow: { select: { id: true, name: true } },
      shelf: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(items)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json()
  const { sku, name, description, unit, warehouseId, warehouseRowId, shelfId } = body
  if (!sku || !name) {
    return NextResponse.json({ error: "sku and name are required" }, { status: 400 })
  }
  const item = await prisma.stockItem.create({
    data: {
      sku, name, description, unit: unit || "units",
      warehouseId: warehouseId || null,
      warehouseRowId: warehouseRowId || null,
      shelfId: shelfId || null,
    },
  })
  return NextResponse.json(item, { status: 201 })
}
