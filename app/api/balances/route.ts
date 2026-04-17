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
    const warehouseId = searchParams.get("warehouseId")

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

    const itemIds = items.map((i) => i.id)

    const transactionGroups = await prisma.transaction.groupBy({
      by: ["stockItemId", "type"],
      where: { stockItemId: { in: itemIds }, deletedAt: null },
      _sum: { quantity: true },
    })
    const stockBalances = await prisma.stockBalance.findMany({
      where: {
        stockItemId: { in: itemIds },
        ...(warehouseId ? { warehouseId } : {}),
      },
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
      },
      orderBy: { warehouse: { name: "asc" } },
    })

    const txByItem = new Map<string, { received: number; handedOut: number; balance: number }>()
    for (const itemId of itemIds) {
      const grouped = transactionGroups.filter((g) => g.stockItemId === itemId)
      let received = 0
      let handedOut = 0
      for (const r of grouped) {
        if (r.type === "RECEIVE") received = r._sum.quantity ?? 0
        if (r.type === "HANDOUT") handedOut = r._sum.quantity ?? 0
      }
      txByItem.set(itemId, { received, handedOut, balance: computeBalance(grouped) })
    }

    const balancesByItem = new Map<string, typeof stockBalances>()
    for (const sb of stockBalances) {
      const arr = balancesByItem.get(sb.stockItemId) || []
      arr.push(sb)
      balancesByItem.set(sb.stockItemId, arr)
    }

    const balances = items.map((item) => {
      const tx = txByItem.get(item.id) || { received: 0, handedOut: 0, balance: 0 }
      const itemBalances = balancesByItem.get(item.id) || []

      const byWarehouse = itemBalances.map((sb) => ({
        warehouseId: sb.warehouse.id,
        warehouseName: sb.warehouse.name,
        warehouseCode: sb.warehouse.code,
        balance: sb.quantity,
      }))

      const totalBalance = warehouseId
        ? byWarehouse.reduce((sum, w) => sum + w.balance, 0)
        : tx.balance

      return {
        id: item.id,
        sku: item.sku,
        name: item.name,
        unit: item.unit,
        description: item.description,
        balance: totalBalance,
        received: tx.received,
        handedOut: tx.handedOut,
        byWarehouse,
      }
    })

    return NextResponse.json(balances)
  } catch (err) {
    console.error("/api/balances error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
