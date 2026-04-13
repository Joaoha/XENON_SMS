import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const userId = (session.user as { id?: string }).id!

  const transaction = await prisma.transaction.findUnique({ where: { id } })
  if (!transaction) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (transaction.deletedAt) {
    return NextResponse.json({ error: "Already deleted" }, { status: 409 })
  }

  await prisma.transaction.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy: userId },
  })

  return NextResponse.json({ ok: true })
}
