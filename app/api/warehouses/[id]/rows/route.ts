import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id: warehouseId } = await params
  const body = await req.json()
  const { name } = body
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }
  try {
    const row = await prisma.warehouseRow.create({ data: { warehouseId, name } })
    return NextResponse.json(row, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create row"
    if (msg.includes("Unique constraint")) {
      const existing = await prisma.warehouseRow.findFirst({ where: { warehouseId, name, isActive: false } })
      if (existing) {
        const reactivated = await prisma.warehouseRow.update({ where: { id: existing.id }, data: { isActive: true } })
        return NextResponse.json(reactivated, { status: 201 })
      }
      return NextResponse.json({ error: "A row with that name already exists in this warehouse" }, { status: 409 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
