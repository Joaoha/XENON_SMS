import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { role, password, isActive } = body

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const currentUserId = (session.user as { id?: string }).id!
  if (id === currentUserId && isActive === false) {
    return NextResponse.json({ error: "Cannot deactivate yourself" }, { status: 400 })
  }
  if (id === currentUserId && role && role !== user.role) {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (role !== undefined) data.role = role
  if (isActive !== undefined) data.isActive = isActive
  if (password) data.passwordHash = await bcrypt.hash(password, 12)

  try {
    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, role: true, isActive: true, createdAt: true },
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const currentUserId = (session.user as { id?: string }).id!

  if (id === currentUserId) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const txCount = await prisma.transaction.count({ where: { userId: id } })
  const deletedByCount = await prisma.transaction.count({ where: { deletedBy: id } })
  if (txCount > 0 || deletedByCount > 0) {
    await prisma.user.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ deactivated: true })
  }

  try {
    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ deleted: true })
  } catch {
    await prisma.user.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ deactivated: true })
  }
}
