import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { computeBalance } from "@/lib/stock"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") || ""

    const items = await prisma.stockItem.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { sku: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
    })

    const balances = await Promise.all(
      items.map(async (item) => {
        const result = await prisma.transaction.groupBy({
          by: ["type"],
          where: { stockItemId: item.id, deletedAt: null },
          _sum: { quantity: true },
        })
        let received = 0
        let handedOut = 0
        for (const r of result) {
          if (r.type === "RECEIVE") received = r._sum.quantity ?? 0
          if (r.type === "HANDOUT") handedOut = r._sum.quantity ?? 0
        }
        return {
          id: item.id,
          sku: item.sku,
          name: item.name,
          unit: item.unit,
          description: item.description,
          balance: computeBalance(result),
          received,
          handedOut,
        }
      })
    )

    return NextResponse.json(balances)
  } catch (err) {
    console.error("/api/balances error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
