import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, ctx: RouteContext) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  const profile = await prisma.handoutProfile.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          stockItem: { select: { id: true, sku: true, name: true, unit: true } },
        },
      },
    },
  })

  if (!profile || !profile.isActive) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 })
  }
  return NextResponse.json(profile)
}

export async function PUT(req: Request, ctx: RouteContext) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
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

  const existing = await prisma.handoutProfile.findUnique({ where: { id } })
  if (!existing || !existing.isActive) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 })
  }

  const duplicate = await prisma.handoutProfile.findUnique({ where: { name } })
  if (duplicate && duplicate.id !== id) {
    return NextResponse.json({ error: "A profile with this name already exists" }, { status: 409 })
  }

  const profile = await prisma.handoutProfile.update({
    where: { id },
    data: {
      name,
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
  return NextResponse.json(profile)
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  const existing = await prisma.handoutProfile.findUnique({ where: { id } })
  if (!existing || !existing.isActive) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 })
  }

  await prisma.handoutProfile.update({
    where: { id },
    data: { isActive: false },
  })
  return NextResponse.json({ success: true })
}
