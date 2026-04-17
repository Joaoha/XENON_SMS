import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; rowId: string }> }) {
  const session = await auth()
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { rowId } = await params
  const row = await prisma.row.findUnique({ where: { id: rowId } })
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const txCount = await prisma.transaction.count({
    where: { rowId, deletedAt: null },
  })
  if (txCount > 0) {
    return NextResponse.json(
      { error: "Cannot remove this row — it has transactions referencing it" },
      { status: 409 }
    )
  }

  await prisma.row.update({ where: { id: rowId }, data: { isActive: false } })
  return NextResponse.json({ deactivated: true })
}
