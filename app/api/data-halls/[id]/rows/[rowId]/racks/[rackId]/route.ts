import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; rowId: string; rackId: string }> }) {
  const session = await auth()
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { rackId } = await params
  const rack = await prisma.rack.findUnique({ where: { id: rackId } })
  if (!rack) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const txCount = await prisma.transaction.count({
    where: { rackId, deletedAt: null },
  })
  if (txCount > 0) {
    return NextResponse.json(
      { error: "Cannot remove this rack — it has transactions referencing it" },
      { status: 409 }
    )
  }

  await prisma.rack.update({ where: { id: rackId }, data: { isActive: false } })
  return NextResponse.json({ deactivated: true })
}
