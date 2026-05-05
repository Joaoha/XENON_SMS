"use client"

import { generatePickingListPdf } from "@/components/picking-list"
import type { PickingListData } from "@/components/picking-list"
import { useState, useEffect, useCallback } from "react"

interface Transaction {
  id: string
  type: "RECEIVE" | "HANDOUT" | "TRANSFER"
  quantity: number
  pickedBy: string | null
  reference: string | null
  notes: string | null
  batchId: string | null
  createdAt: string
  deletedAt: string | null
  stockItem: { id: string; sku: string; name: string; unit: string }
  user: { id: string; username: string }
  dataHall: { id: string; code: string; name: string } | null
  row: { id: string; name: string } | null
  rack: { id: string; name: string } | null
  sourceWarehouse: { id: string; name: string; code: string } | null
  destinationWarehouse: { id: string; name: string; code: string } | null
  deletedByUser: { id: string; username: string } | null
}

interface StockItem {
  id: string
  sku: string
  name: string
}

interface Warehouse {
  id: string
  code: string
  name: string
  isActive: boolean
}

interface DataHall {
  id: string
  code: string
  name: string
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [items, setItems] = useState<StockItem[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [dataHalls, setDataHalls] = useState<DataHall[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    itemId: "",
    type: "",
    pickedBy: "",
    from: "",
    to: "",
    warehouseId: "",
    dataHallId: "",
  })
  const [page, setPage] = useState(1)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const limit = 50

  useEffect(() => {
    const safeJson = (r: Response) => r.json().catch(() => null)
    Promise.all([
      fetch("/api/stock-items").then(safeJson),
      fetch("/api/me").then(safeJson),
      fetch("/api/warehouses").then(safeJson),
      fetch("/api/data-halls").then(safeJson),
    ]).then(([stockItems, me, wh, dh]) => {
      if (Array.isArray(stockItems)) setItems(stockItems)
      if (me?.role) setUserRole(me.role)
      if (Array.isArray(wh)) setWarehouses(wh)
      if (Array.isArray(dh)) setDataHalls(dh)
    })
  }, [])

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.itemId) params.set("itemId", filters.itemId)
    if (filters.type) params.set("type", filters.type)
    if (filters.pickedBy) params.set("pickedBy", filters.pickedBy)
    if (filters.from) params.set("from", filters.from)
    if (filters.to) params.set("to", filters.to)
    if (filters.warehouseId) params.set("warehouseId", filters.warehouseId)
    if (filters.dataHallId) params.set("dataHallId", filters.dataHallId)
    params.set("page", String(page))
    params.set("limit", String(limit))
    const res = await fetch(`/api/transactions?${params}`)
    if (!res.ok) {
      setLoading(false)
      return
    }
    const data = await res.json()
    setTransactions(data.transactions)
    setTotal(data.total)
    setLoading(false)
  }, [filters, page])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  function handleFilterChange(key: string, value: string) {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(1)
  }

  async function handleReprintBatch(batchId: string) {
    const res = await fetch(`/api/transactions/batch/${batchId}`)
    if (!res.ok) return
    const { transactions: batchTxns } = await res.json()
    const first = batchTxns[0]
    const destParts = [
      first.dataHall ? `${first.dataHall.code} \u2014 ${first.dataHall.name}` : "",
      first.row ? first.row.name : "",
      first.rack ? first.rack.name : "",
    ].filter(Boolean)

    const data: PickingListData = {
      date: new Date(first.createdAt).toLocaleDateString(),
      picker: first.pickedBy || "\u2014",
      destination: destParts.join(" \u2192 ") || "\u2014",
      reference: first.reference || "",
      notes: first.notes || "",
      items: batchTxns.map((t: { stockItem: { sku: string; name: string; unit: string; warehouse: { name: string } | null; warehouseRow: { name: string } | null; shelf: { name: string } | null }; quantity: number }) => {
        const loc = [t.stockItem.warehouse?.name, t.stockItem.warehouseRow?.name, t.stockItem.shelf?.name].filter(Boolean)
        return {
          sku: t.stockItem.sku,
          name: t.stockItem.name,
          quantity: t.quantity,
          unit: t.stockItem.unit,
          storageLocation: loc.length > 0 ? loc.join(" \u2192 ") : null,
        }
      }),
    }
    const doc = generatePickingListPdf(data)
    const blob = doc.output("blob")
    const url = URL.createObjectURL(blob)
    window.open(url, "_blank")
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" })
      if (res.ok) {
        setConfirmDeleteId(null)
        fetchTransactions()
      }
    } finally {
      setDeleting(false)
    }
  }

  function formatDestination(t: Transaction): string {
    if (t.type === "TRANSFER") {
      const src = t.sourceWarehouse ? `${t.sourceWarehouse.code}` : "?"
      const dst = t.destinationWarehouse ? `${t.destinationWarehouse.code}` : "?"
      return `${src} \u2192 ${dst}`
    }
    if (t.type === "RECEIVE" && t.destinationWarehouse) {
      return `\u2192 ${t.destinationWarehouse.code}`
    }
    if (t.type === "HANDOUT" && t.sourceWarehouse) {
      return `${t.sourceWarehouse.code} \u2192 ${t.dataHall ? `${t.dataHall.code} / ${t.row?.name} / ${t.rack?.name}` : "\u2014"}`
    }
    if (t.dataHall) {
      return `${t.dataHall.code} / ${t.row?.name} / ${t.rack?.name}`
    }
    return "\u2014"
  }

  function typeColor(type: string): string {
    switch (type) {
      case "RECEIVE": return "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300"
      case "HANDOUT": return "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300"
      case "TRANSFER": return "bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300"
      default: return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
    }
  }

  function qtyPrefix(type: string): string {
    switch (type) {
      case "RECEIVE": return "+"
      case "HANDOUT": return "-"
      default: return ""
    }
  }

  const totalPages = Math.ceil(total / limit)

  const filterCls = "rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"

  return (
    <div className="space-y-6">
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Delete transaction?</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              This transaction will be soft-deleted and excluded from stock balances. It will remain visible in the audit history.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deleting}
                className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
              >
                {deleting ? "Deleting\u2026" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Transaction History</h1>
        <a
          href="/api/export"
          className="px-4 py-2 bg-gray-700 dark:bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-500"
        >
          Export CSV
        </a>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 grid grid-cols-2 md:grid-cols-7 gap-3">
        <select
          value={filters.itemId}
          onChange={(e) => handleFilterChange("itemId", e.target.value)}
          className={filterCls}
        >
          <option value="">All items</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.sku} \u2014 {item.name}
            </option>
          ))}
        </select>

        <select
          value={filters.type}
          onChange={(e) => handleFilterChange("type", e.target.value)}
          className={filterCls}
        >
          <option value="">All types</option>
          <option value="RECEIVE">Receive</option>
          <option value="HANDOUT">Handout</option>
          <option value="TRANSFER">Transfer</option>
        </select>

        <select
          value={filters.warehouseId}
          onChange={(e) => handleFilterChange("warehouseId", e.target.value)}
          className={filterCls}
        >
          <option value="">All warehouses</option>
          {warehouses.map((wh) => (
            <option key={wh.id} value={wh.id}>
              {wh.code} \u2014 {wh.name}
            </option>
          ))}
        </select>

        <select
          value={filters.dataHallId}
          onChange={(e) => handleFilterChange("dataHallId", e.target.value)}
          className={filterCls}
        >
          <option value="">All destinations</option>
          {dataHalls.map((dh) => (
            <option key={dh.id} value={dh.id}>
              {dh.code} — {dh.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Picked by..."
          value={filters.pickedBy}
          onChange={(e) => handleFilterChange("pickedBy", e.target.value)}
          className={`${filterCls} placeholder-gray-400 dark:placeholder-gray-500`}
        />

        <input
          type="date"
          value={filters.from}
          onChange={(e) => handleFilterChange("from", e.target.value)}
          className={filterCls}
        />

        <input
          type="date"
          value={filters.to}
          onChange={(e) => handleFilterChange("to", e.target.value)}
          className={filterCls}
        />
      </div>

      {loading ? (
        <div className="text-gray-500 dark:text-gray-400 text-sm">Loading...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">No transactions found.</div>
      ) : (
        <>
          <div className="text-sm text-gray-500 dark:text-gray-400">{total} transaction{total !== 1 ? "s" : ""}</div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date/Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Item</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Recorded By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Picked By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {transactions.map((t) => {
                  const isDeleted = !!t.deletedAt
                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${isDeleted ? "opacity-50" : ""}`}
                    >
                      <td className={`px-4 py-3 whitespace-nowrap ${isDeleted ? "line-through text-gray-400 dark:text-gray-500" : "text-gray-500 dark:text-gray-400"}`}>
                        <div>{new Date(t.createdAt).toLocaleString()}</div>
                        {isDeleted && (
                          <div className="text-xs text-red-500 dark:text-red-400 no-underline" style={{ textDecoration: "none" }}>
                            Deleted {new Date(t.deletedAt!).toLocaleString()} by {t.deletedByUser?.username ?? "unknown"}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isDeleted ? (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
                            DELETED
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColor(t.type)}`}>
                            {t.type}
                          </span>
                        )}
                      </td>
                      <td className={`px-4 py-3 ${isDeleted ? "line-through" : ""}`}>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{t.stockItem.name}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">{t.stockItem.sku}</div>
                      </td>
                      <td className={`px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100 ${isDeleted ? "line-through" : ""}`}>
                        {qtyPrefix(t.type)}{t.quantity} {t.stockItem.unit}
                      </td>
                      <td className={`px-4 py-3 ${isDeleted ? "line-through text-gray-400" : "text-gray-600 dark:text-gray-400"}`}>{t.user.username}</td>
                      <td className={`px-4 py-3 ${isDeleted ? "line-through text-gray-400" : "text-gray-600 dark:text-gray-400"}`}>{t.pickedBy || "\u2014"}</td>
                      <td className={`px-4 py-3 ${isDeleted ? "line-through text-gray-400" : "text-gray-600 dark:text-gray-400"}`}>
                        {formatDestination(t)}
                      </td>
                      <td className={`px-4 py-3 ${isDeleted ? "line-through text-gray-400" : "text-gray-500 dark:text-gray-400"}`}>{t.reference || "\u2014"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {!isDeleted && t.type === "HANDOUT" && t.batchId && (
                            <button
                              onClick={() => handleReprintBatch(t.batchId!)}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                              title="Print stock handout"
                            >
                              Print
                            </button>
                          )}
                          {!isDeleted && userRole === "admin" && (
                            <button
                              onClick={() => setConfirmDeleteId(t.id)}
                              className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-40"
              >
                \u2190 Prev
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-40"
              >
                Next \u2192
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
