import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const profiles = await prisma.handoutProfile.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      items: {
        include: {
          stockItem: { select: { id: true, sku: true, name: true, unit: true } },
        },
      },
    },
  })
  return NextResponse.json(profiles)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { name, description, items } = body

  if (!name || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "name and at least one item are required" },
      { status: 400 }
    )
  }

  for (const item of items) {
    if (!item.stockItemId || !item.quantity || item.quantity < 1) {
      return NextResponse.json(
        { error: "Each item must have a stockItemId and quantity >= 1" },
        { status: 400 }
      )
    }
  }

  const stockItemIds = items.map((i: { stockItemId: string }) => i.stockItemId)
  if (new Set(stockItemIds).size !== stockItemIds.length) {
    return NextResponse.json(
      { error: "Duplicate items are not allowed in the same profile" },
      { status: 400 }
    )
  }

  const existing = await prisma.handoutProfile.findUnique({ where: { name } })
  if (existing && existing.isActive) {
    return NextResponse.json({ error: "A profile with this name already exists" }, { status: 409 })
  }

  if (existing && !existing.isActive) {
    const profile = await prisma.handoutProfile.update({
      where: { id: existing.id },
      data: {
        isActive: true,
        description: description || null,
        items: {
          deleteMany: {},
          create: items.map((i: { stockItemId: string; quantity: number }) => ({
            stockItemId: i.stockItemId,
            quantity: i.quantity,
          })),
        },
      },
      include: {
        items: {
          include: {
            stockItem: { select: { id: true, sku: true, name: true, unit: true } },
          },
        },
      },
    })
    return NextResponse.json(profile, { status: 201 })
  }

  const profile = await prisma.handoutProfile.create({
    data: {
      name,
      description: description || null,
      items: {
        create: items.map((i: { stockItemId: string; quantity: number }) => ({
          stockItemId: i.stockItemId,
          quantity: i.quantity,
        })),
      },
    },
    include: {
      items: {
        include: {
          stockItem: { select: { id: true, sku: true, name: true, unit: true } },
        },
      },
    },
  })
  return NextResponse.json(profile, { status: 201 })
}
