import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

// One-time seed endpoint to create initial admin user
// POST /api/seed with { username, password } - only works if no users exist
export async function POST(req: Request) {
  const count = await prisma.user.count()
  if (count > 0) {
    return NextResponse.json({ error: "Already seeded" }, { status: 400 })
  }
  const body = await req.json()
  const { username = "admin", password = "changeme" } = body
  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { username, passwordHash, role: "admin" },
  })
  return NextResponse.json({ id: user.id, username: user.username, role: user.role })
}
