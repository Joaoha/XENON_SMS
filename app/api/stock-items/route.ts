import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const items = await prisma.stockItem.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  })
  return NextResponse.json(items)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const body = await req.json()
  const { sku, name, description, unit } = body
  if (!sku || !name) {
    return NextResponse.json({ error: "sku and name are required" }, { status: 400 })
  }
  const item = await prisma.stockItem.create({
    data: { sku, name, description, unit: unit || "units" },
  })
  return NextResponse.json(item, { status: 201 })
}
