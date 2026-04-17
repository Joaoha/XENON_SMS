import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; rowId: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { rowId: warehouseRowId } = await params
  const body = await req.json()
  const { name } = body
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }
  try {
    const shelf = await prisma.shelf.create({ data: { warehouseRowId, name } })
    return NextResponse.json(shelf, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create shelf"
    if (msg.includes("Unique constraint")) {
      const existing = await prisma.shelf.findFirst({ where: { warehouseRowId, name, isActive: false } })
      if (existing) {
        const reactivated = await prisma.shelf.update({ where: { id: existing.id }, data: { isActive: true } })
        return NextResponse.json(reactivated, { status: 201 })
      }
      return NextResponse.json({ error: "A shelf with that name already exists in this row" }, { status: 409 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
