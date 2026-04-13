import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const halls = await prisma.dataHall.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
    include: {
      rows: {
        where: { isActive: true },
        orderBy: { code: "asc" },
        include: {
          racks: {
            where: { isActive: true },
            orderBy: { code: "asc" },
          },
        },
      },
    },
  })
  return NextResponse.json(halls)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const body = await req.json()
  const { name, code } = body
  if (!name || !code) {
    return NextResponse.json({ error: "name and code are required" }, { status: 400 })
  }
  const hall = await prisma.dataHall.create({ data: { name, code: code.toUpperCase() } })
  return NextResponse.json(hall, { status: 201 })
}
