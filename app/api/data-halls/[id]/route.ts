import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const hall = await prisma.dataHall.findUnique({ where: { id } })
  if (!hall) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const txCount = await prisma.transaction.count({
    where: { dataHallId: id, deletedAt: null },
  })
  if (txCount > 0) {
    return NextResponse.json(
      { error: "Cannot remove this destination — it has transactions referencing it" },
      { status: 409 }
    )
  }

  await prisma.dataHall.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ deactivated: true })
}
