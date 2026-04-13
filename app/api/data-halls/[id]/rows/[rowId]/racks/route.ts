import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; rowId: string }> }
) {
  const session = await auth()
  if (!session || (session.user as { role?: string }).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { rowId } = await params
  const body = await req.json()
  const { name, code } = body
  if (!name || !code) {
    return NextResponse.json({ error: "name and code are required" }, { status: 400 })
  }
  const rack = await prisma.rack.create({ data: { rowId, name, code: code.toUpperCase() } })
  return NextResponse.json(rack, { status: 201 })
}
