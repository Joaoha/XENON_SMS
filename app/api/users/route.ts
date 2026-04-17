import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function GET() {
  const session = await auth()
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true, isActive: true, createdAt: true },
    orderBy: { username: "asc" },
  })
  return NextResponse.json(users)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const body = await req.json()
  const { username, password, role } = body
  if (!username || !password) {
    return NextResponse.json({ error: "username and password required" }, { status: 400 })
  }
  try {
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { username, passwordHash, role: role || "operator" },
      select: { id: true, username: true, role: true, isActive: true, createdAt: true },
    })
    return NextResponse.json(user, { status: 201 })
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
