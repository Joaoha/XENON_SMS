"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

interface Balance {
  id: string
  sku: string
  name: string
  unit: string
  description: string | null
  balance: number
  received: number
  handedOut: number
}

export default function DashboardPage() {
  const [balances, setBalances] = useState<Balance[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  const fetchBalances = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/balances?search=${encodeURIComponent(search)}`)
    if (!res.ok) {
      setLoading(false)
      return
    }
    const data = await res.json()
    setBalances(data)
    setLoading(false)
  }, [search])

  useEffect(() => {
    const t = setTimeout(fetchBalances, 300)
    return () => clearTimeout(t)
  }, [fetchBalances])

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
        </div>
      </div>

      <input
        type="text"
        placeholder="Search by item name or SKU..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500"
      />

      {loading ? (
        <div className="text-gray-500 dark:text-gray-400 text-sm">Loading...</div>
      ) : balances.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {search
            ? "No items match your search."
            : "No stock items found. Add some in Admin → Stock Items."}
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
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</div>
                    {item.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">{item.description}</div>
                    )}
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
