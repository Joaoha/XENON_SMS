import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json()
  const { sku, name, description, unit, warehouseId, warehouseRowId, shelfId, isActive } = body
  const item = await prisma.stockItem.update({
    where: { id },
    data: {
      sku, name, description, unit, isActive,
      warehouseId: warehouseId !== undefined ? (warehouseId || null) : undefined,
      warehouseRowId: warehouseRowId !== undefined ? (warehouseRowId || null) : undefined,
      shelfId: shelfId !== undefined ? (shelfId || null) : undefined,
    },
  })
  return NextResponse.json(item)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await params
    const body = await req.json()
    const { warehouseId, warehouseRowId, shelfId } = body
    const item = await prisma.stockItem.update({
      where: { id },
      data: {
        warehouseId: warehouseId || null,
        warehouseRowId: warehouseRowId || null,
        shelfId: shelfId || null,
      },
    })
    return NextResponse.json(item)
  } catch (err) {
    console.error("/api/stock-items PATCH error:", err)
    return NextResponse.json({ error: "Failed to update stock item" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  await prisma.stockItem.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}
