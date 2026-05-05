"use client"

import { useState, useEffect, useCallback } from "react"

interface Transaction {
  id: string
  type: "RECEIVE" | "HANDOUT"
  quantity: number
  pickedBy: string | null
  reference: string | null
  createdAt: string
  stockItem: { sku: string; name: string; unit: string }
  user: { username: string }
  dataHall: { code: string; name: string } | null
  row: { name: string } | null
  rack: { name: string } | null
}

interface StockItem {
  id: string
  sku: string
  name: string
}

interface DataHall {
  id: string
  code: string
  name: string
}

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [items, setItems] = useState<StockItem[]>([])
  const [dataHalls, setDataHalls] = useState<DataHall[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ from: "", to: "", itemId: "", type: "HANDOUT", dataHallId: "" })

  useEffect(() => {
    fetch("/api/stock-items")
      .then((r) => r.json())
      .then(setItems)
    fetch("/api/data-halls")
      .then((r) => r.json())
      .then((dh) => { if (Array.isArray(dh)) setDataHalls(dh) })
  }, [])

  const run = useCallback(async () => {
    if (!filters.from && !filters.to) return
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.itemId) params.set("itemId", filters.itemId)
    if (filters.type) params.set("type", filters.type)
    if (filters.from) params.set("from", filters.from)
    if (filters.to) params.set("to", filters.to)
    if (filters.dataHallId) params.set("dataHallId", filters.dataHallId)
    params.set("limit", "1000")
    const res = await fetch(`/api/transactions?${params}`)
    const data = await res.json()
    setTransactions(data.transactions ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [filters])

  // Aggregate by person
  const byPerson: Record<string, { name: string; qty: number; items: Record<string, number> }> = {}
  const byDestination: Record<string, { label: string; qty: number }> = {}
  const byItem: Record<string, { name: string; sku: string; unit: string; qty: number }> = {}

  for (const t of transactions) {
    if (t.pickedBy) {
      if (!byPerson[t.pickedBy]) byPerson[t.pickedBy] = { name: t.pickedBy, qty: 0, items: {} }
      byPerson[t.pickedBy].qty += t.quantity
      byPerson[t.pickedBy].items[t.stockItem.name] =
        (byPerson[t.pickedBy].items[t.stockItem.name] || 0) + t.quantity
    }
    if (t.dataHall) {
      const parts = [t.dataHall.code, t.row?.name, t.rack?.name].filter(Boolean)
      const key = parts.join(" / ")
      if (!byDestination[key]) byDestination[key] = { label: key, qty: 0 }
      byDestination[key].qty += t.quantity
    }
    const itemKey = t.stockItem.sku
    if (!byItem[itemKey])
      byItem[itemKey] = { name: t.stockItem.name, sku: t.stockItem.sku, unit: t.stockItem.unit, qty: 0 }
    byItem[itemKey].qty += t.quantity
  }

  const exportUrl = () => {
    const params = new URLSearchParams()
    if (filters.type) params.set("type", filters.type)
    if (filters.itemId) params.set("itemId", filters.itemId)
    if (filters.from) params.set("from", filters.from)
    if (filters.to) params.set("to", filters.to)
    if (filters.dataHallId) params.set("dataHallId", filters.dataHallId)
    return `/api/export?${params}`
  }

  const filterSelectCls = "w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reports</h1>
        {transactions.length > 0 && (
          <a
            href={exportUrl()}
            className="px-4 py-2 bg-gray-700 dark:bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-500"
          >
            Export CSV
          </a>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
        <h2 className="font-medium text-gray-700 dark:text-gray-300">Filter Transactions</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
              className={filterSelectCls}
            >
              <option value="">All types</option>
              <option value="RECEIVE">Receive</option>
              <option value="HANDOUT">Handout</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Stock Item</label>
            <select
              value={filters.itemId}
              onChange={(e) => setFilters((f) => ({ ...f, itemId: e.target.value }))}
              className={filterSelectCls}
            >
              <option value="">All items</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sku}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Destination</label>
            <select
              value={filters.dataHallId}
              onChange={(e) => setFilters((f) => ({ ...f, dataHallId: e.target.value }))}
              className={filterSelectCls}
            >
              <option value="">All destinations</option>
              {dataHalls.map((dh) => (
                <option key={dh.id} value={dh.id}>
                  {dh.code} — {dh.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">From Date</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              className={filterSelectCls}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">To Date</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              className={filterSelectCls}
            />
          </div>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Running..." : "Run Report"}
        </button>
      </div>

      {transactions.length > 0 && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {total} transaction{total !== 1 ? "s" : ""} matched
        </div>
      )}

      {Object.keys(byItem).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">By Item</h2>
          </div>
          <table className="min-w-full text-sm divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-gray-500 dark:text-gray-400 uppercase">SKU</th>
                <th className="px-4 py-2 text-left text-xs text-gray-500 dark:text-gray-400 uppercase">Name</th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 dark:text-gray-400 uppercase">Total Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {Object.values(byItem)
                .sort((a, b) => b.qty - a.qty)
                .map((item) => (
                  <tr key={item.sku}>
                    <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{item.sku}</td>
                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{item.name}</td>
                    <td className="px-4 py-2 text-right font-bold text-gray-900 dark:text-gray-100">
                      {item.qty} {item.unit}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {Object.keys(byPerson).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">By Person (Picker)</h2>
          </div>
          <table className="min-w-full text-sm divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-gray-500 dark:text-gray-400 uppercase">Person</th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 dark:text-gray-400 uppercase">Total Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {Object.values(byPerson)
                .sort((a, b) => b.qty - a.qty)
                .map((p) => (
                  <tr key={p.name}>
                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{p.name}</td>
                    <td className="px-4 py-2 text-right font-bold text-gray-900 dark:text-gray-100">{p.qty}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {Object.keys(byDestination).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">By Destination</h2>
          </div>
          <table className="min-w-full text-sm divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-gray-500 dark:text-gray-400 uppercase">
                  Hall / Row / Rack
                </th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 dark:text-gray-400 uppercase">Total Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {Object.values(byDestination)
                .sort((a, b) => b.qty - a.qty)
                .map((d) => (
                  <tr key={d.label}>
                    <td className="px-4 py-2 font-mono text-gray-700 dark:text-gray-300">{d.label}</td>
                    <td className="px-4 py-2 text-right font-bold text-gray-900 dark:text-gray-100">{d.qty}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
