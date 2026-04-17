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
  const { rowId } = await params
  const body = await req.json()
  const { name } = body
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }
  try {
    const rack = await prisma.rack.create({ data: { rowId, name } })
    return NextResponse.json(rack, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create rack"
    if (msg.includes("Unique constraint")) {
      const existing = await prisma.rack.findFirst({ where: { rowId, name, isActive: false } })
      if (existing) {
        const reactivated = await prisma.rack.update({ where: { id: existing.id }, data: { isActive: true } })
        return NextResponse.json(reactivated, { status: 201 })
      }
      return NextResponse.json({ error: "A rack with that name already exists in this row" }, { status: 409 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
