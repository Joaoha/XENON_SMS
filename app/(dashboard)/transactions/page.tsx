"use client"

import { useState, useEffect, useCallback } from "react"

interface Transaction {
  id: string
  type: "RECEIVE" | "HANDOUT"
  quantity: number
  pickedBy: string | null
  reference: string | null
  notes: string | null
  createdAt: string
  deletedAt: string | null
  stockItem: { id: string; sku: string; name: string; unit: string }
  user: { id: string; username: string }
  dataHall: { id: string; code: string; name: string } | null
  row: { id: string; code: string; name: string } | null
  rack: { id: string; code: string; name: string } | null
  deletedByUser: { id: string; username: string } | null
}

interface StockItem {
  id: string
  sku: string
  name: string
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [items, setItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    itemId: "",
    type: "",
    pickedBy: "",
    from: "",
    to: "",
  })
  const [page, setPage] = useState(1)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const limit = 50

  useEffect(() => {
    fetch("/api/stock-items")
      .then((r) => r.json())
      .then(setItems)
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => setUserRole(data.role))
  }, [])

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.itemId) params.set("itemId", filters.itemId)
    if (filters.type) params.set("type", filters.type)
    if (filters.pickedBy) params.set("pickedBy", filters.pickedBy)
    if (filters.from) params.set("from", filters.from)
    if (filters.to) params.set("to", filters.to)
    params.set("page", String(page))
    params.set("limit", String(limit))
    try {
      const res = await fetch(`/api/transactions?${params}`)
      if (!res.ok) {
        setLoading(false)
        return
      }
      const data = await res.json()
      setTransactions(data.transactions)
      setTotal(data.total)
    } catch {
      // network error or malformed response
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  function handleFilterChange(key: string, value: string) {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(1)
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
                {deleting ? "Deleting…" : "Delete"}
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

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        <select
          value={filters.itemId}
          onChange={(e) => handleFilterChange("itemId", e.target.value)}
          className={filterCls}
        >
          <option value="">All items</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.sku} — {item.name}
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Destination</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Reference</th>
                  {userRole === "admin" && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  )}
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
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              t.type === "RECEIVE"
                                ? "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300"
                                : "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300"
                            }`}
                          >
                            {t.type}
                          </span>
                        )}
                      </td>
                      <td className={`px-4 py-3 ${isDeleted ? "line-through" : ""}`}>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{t.stockItem.name}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">{t.stockItem.sku}</div>
                      </td>
                      <td className={`px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100 ${isDeleted ? "line-through" : ""}`}>
                        {t.type === "RECEIVE" ? "+" : "-"}{t.quantity} {t.stockItem.unit}
                      </td>
                      <td className={`px-4 py-3 ${isDeleted ? "line-through text-gray-400" : "text-gray-600 dark:text-gray-400"}`}>{t.user.username}</td>
                      <td className={`px-4 py-3 ${isDeleted ? "line-through text-gray-400" : "text-gray-600 dark:text-gray-400"}`}>{t.pickedBy || "—"}</td>
                      <td className={`px-4 py-3 ${isDeleted ? "line-through text-gray-400" : "text-gray-600 dark:text-gray-400"}`}>
                        {t.dataHall
                          ? `${t.dataHall.code} / ${t.row?.code} / ${t.rack?.code}`
                          : "—"}
                      </td>
                      <td className={`px-4 py-3 ${isDeleted ? "line-through text-gray-400" : "text-gray-500 dark:text-gray-400"}`}>{t.reference || "—"}</td>
                      {userRole === "admin" && (
                        <td className="px-4 py-3">
                          {!isDeleted && (
                            <button
                              onClick={() => setConfirmDeleteId(t.id)}
                              className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      )}
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
                ← Prev
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
