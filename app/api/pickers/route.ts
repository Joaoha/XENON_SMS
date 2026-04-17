import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const rows = await prisma.transaction.findMany({
      where: { type: "HANDOUT", pickedBy: { not: null }, deletedAt: null },
      select: { pickedBy: true },
      distinct: ["pickedBy"],
      orderBy: { pickedBy: "asc" },
    })

    const pickers = rows.map((r) => r.pickedBy as string)
    return NextResponse.json(pickers)
  } catch (err) {
    console.error("GET /api/pickers error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
