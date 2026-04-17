"use client"

import { useState, useEffect, useCallback, Fragment } from "react"
import Link from "next/link"

interface WarehouseBalance {
  warehouseId: string
  warehouseName: string
  warehouseCode: string
  balance: number
}

interface Balance {
  id: string
  sku: string
  name: string
  unit: string
  description: string | null
  balance: number
  received: number
  handedOut: number
  byWarehouse: WarehouseBalance[]
}

interface Warehouse {
  id: string
  code: string
  name: string
  isActive: boolean
}

export default function DashboardPage() {
  const [balances, setBalances] = useState<Balance[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [warehouseFilter, setWarehouseFilter] = useState("")
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch("/api/warehouses")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setWarehouses(data.filter((w: Warehouse) => w.isActive))
      })
  }, [])

  const fetchBalances = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (warehouseFilter) params.set("warehouseId", warehouseFilter)
    const res = await fetch(`/api/balances?${params}`)
    if (!res.ok) {
      setLoading(false)
      return
    }
    const data = await res.json()
    setBalances(data)
    setLoading(false)
  }, [search, warehouseFilter])

  useEffect(() => {
    const t = setTimeout(fetchBalances, 300)
    return () => clearTimeout(t)
  }, [fetchBalances])

  function toggleExpand(id: string) {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Stock Balances</h1>
        <div className="flex gap-3">
          <Link
            href="/receive"
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
          >
            + Receive Stock
          </Link>
          <Link
            href="/handout"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            Hand Out Stock
          </Link>
          <Link
            href="/transfer"
            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700"
          >
            Transfer Stock
          </Link>
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <input
          type="text"
          placeholder="Search by item name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500"
        />
        <select
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
        >
          <option value="">All warehouses</option>
          {warehouses.map((wh) => (
            <option key={wh.id} value={wh.id}>
              {wh.code} — {wh.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-gray-500 dark:text-gray-400 text-sm">Loading...</div>
      ) : balances.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {search
            ? "No items match your search."
            : "No stock items found. Add some in Admin \u2192 Stock Items."}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Received
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Handed Out
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {balances.map((item) => (
                <Fragment key={item.id}>
                  <tr
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${item.byWarehouse.length > 0 ? "cursor-pointer" : ""}`}
                    onClick={() => item.byWarehouse.length > 0 && toggleExpand(item.id)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {item.byWarehouse.length > 0 && (
                          <span className="text-gray-400 dark:text-gray-500 text-xs">
                            {expandedItems.has(item.id) ? "\u25BC" : "\u25B6"}
                          </span>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</div>
                          {item.description && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">{item.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{item.sku}</td>
                    <td className="px-6 py-4 text-sm text-right text-green-700 dark:text-green-400">
                      +{item.received} {item.unit}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-red-600 dark:text-red-400">
                      -{item.handedOut} {item.unit}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`text-sm font-bold ${
                          item.balance < 0
                            ? "text-red-700 dark:text-red-400"
                            : item.balance === 0
                            ? "text-gray-500 dark:text-gray-400"
                            : "text-gray-900 dark:text-gray-100"
                        }`}
                      >
                        {item.balance} {item.unit}
                      </span>
                    </td>
                  </tr>
                  {expandedItems.has(item.id) && item.byWarehouse.map((wh) => (
                    <tr key={`${item.id}-${wh.warehouseId}`} className="bg-gray-50/50 dark:bg-gray-900/50">
                      <td className="px-6 py-2 pl-14" colSpan={4}>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {wh.warehouseCode} — {wh.warehouseName}
                        </span>
                      </td>
                      <td className="px-6 py-2 text-right">
                        <span className={`text-xs font-medium ${
                          wh.balance < 0
                            ? "text-red-600 dark:text-red-400"
                            : wh.balance === 0
                            ? "text-gray-400 dark:text-gray-500"
                            : "text-gray-700 dark:text-gray-300"
                        }`}>
                          {wh.balance} {item.unit}
                        </span>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
