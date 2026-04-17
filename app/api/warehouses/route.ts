import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const warehouses = await prisma.warehouse.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
    include: {
      rows: {
        where: { isActive: true },
        orderBy: { name: "asc" },
        include: {
          shelves: {
            where: { isActive: true },
            orderBy: { name: "asc" },
          },
        },
      },
    },
  })
  return NextResponse.json(warehouses)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json()
  const { name, code } = body
  if (!name || !code) {
    return NextResponse.json({ error: "name and code are required" }, { status: 400 })
  }
  try {
    const warehouse = await prisma.warehouse.create({ data: { name, code: code.toUpperCase() } })
    return NextResponse.json(warehouse, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create warehouse"
    if (msg.includes("Unique constraint")) {
      const existing = await prisma.warehouse.findFirst({ where: { code: code.toUpperCase(), isActive: false } })
      if (existing) {
        const reactivated = await prisma.warehouse.update({ where: { id: existing.id }, data: { name, isActive: true } })
        return NextResponse.json(reactivated, { status: 201 })
      }
      return NextResponse.json({ error: "A warehouse with that code already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
