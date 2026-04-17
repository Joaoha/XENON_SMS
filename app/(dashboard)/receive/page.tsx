"use client"

import { useState, useEffect, FormEvent } from "react"
import { useRouter } from "next/navigation"

interface StockItem {
  id: string
  sku: string
  name: string
  unit: string
}

interface Warehouse {
  id: string
  code: string
  name: string
  rows: WRow[]
}

interface WRow {
  id: string
  name: string
  shelves: WShelf[]
}

interface WShelf {
  id: string
  name: string
}

export default function ReceivePage() {
  const router = useRouter()
  const [items, setItems] = useState<StockItem[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState("")
  const [selectedRow, setSelectedRow] = useState("")
  const [selectedShelf, setSelectedShelf] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    const safeJson = (r: Response) => r.json().catch(() => null)
    Promise.all([
      fetch("/api/stock-items").then(safeJson),
      fetch("/api/warehouses").then(safeJson),
    ]).then(([stockItems, wh]) => {
      if (Array.isArray(stockItems)) setItems(stockItems)
      if (Array.isArray(wh)) setWarehouses(wh)
    })
  }, [])

  const whRows = warehouses.find((w) => w.id === selectedWarehouse)?.rows || []
  const whShelves = whRows.find((r) => r.id === selectedRow)?.shelves || []

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)
    const form = e.currentTarget
    const data = {
      type: "RECEIVE",
      stockItemId: (form.elements.namedItem("stockItemId") as HTMLSelectElement).value,
      quantity: parseInt((form.elements.namedItem("quantity") as HTMLInputElement).value),
      reference: (form.elements.namedItem("reference") as HTMLInputElement).value,
      notes: (form.elements.namedItem("notes") as HTMLTextAreaElement).value,
      destinationWarehouseId: selectedWarehouse || undefined,
    }
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    setLoading(false)
    if (!res.ok) {
      const err = await res.json()
      setError(err.error || "Failed to record receipt")
    } else {
      if (selectedWarehouse || selectedRow || selectedShelf) {
        const stockItemId = (form.elements.namedItem("stockItemId") as HTMLSelectElement).value
        await fetch(`/api/stock-items/${stockItemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            warehouseId: selectedWarehouse || null,
            warehouseRowId: selectedRow || null,
            shelfId: selectedShelf || null,
          }),
        })
      }
      setSuccess("Stock receipt recorded successfully!")
      form.reset()
      setSelectedWarehouse("")
      setSelectedRow("")
      setSelectedShelf("")
    }
  }

  const inputCls = "mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
  const inputClsDisabled = `${inputCls} disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500`

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Receive Stock</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Record incoming stock items.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Stock Item *</label>
          <select
            name="stockItemId"
            required
            className={inputCls}
          >
            <option value="">Select item...</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                [{item.sku}] {item.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity *</label>
          <input
            name="quantity"
            type="number"
            min="1"
            required
            className={inputCls}
          />
        </div>

        <fieldset className="border border-gray-200 dark:border-gray-600 rounded-md p-4 space-y-3">
          <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 px-1">Storage Location *</legend>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Warehouse</label>
            <select
              value={selectedWarehouse}
              onChange={(e) => {
                setSelectedWarehouse(e.target.value)
                setSelectedRow("")
                setSelectedShelf("")
              }}
              required
              className={inputCls}
            >
              <option value="">Select warehouse...</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} — {w.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Row</label>
            <select
              value={selectedRow}
              onChange={(e) => {
                setSelectedRow(e.target.value)
                setSelectedShelf("")
              }}
              disabled={!selectedWarehouse}
              className={inputClsDisabled}
            >
              <option value="">Select row...</option>
              {whRows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Shelf</label>
            <select
              value={selectedShelf}
              onChange={(e) => setSelectedShelf(e.target.value)}
              disabled={!selectedRow}
              className={inputClsDisabled}
            >
              <option value="">Select shelf...</option>
              {whShelves.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </fieldset>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reference / PO Number</label>
          <input
            name="reference"
            type="text"
            placeholder="e.g. PO-12345"
            className={`${inputCls} placeholder-gray-400 dark:placeholder-gray-500`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
          <textarea
            name="notes"
            rows={3}
            className={inputCls}
          />
        </div>

        {error && <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-400">{error}</div>}
        {success && (
          <div className="rounded-md bg-green-50 dark:bg-green-900/30 p-3 text-sm text-green-700 dark:text-green-400">{success}</div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Recording..." : "Record Receipt"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
