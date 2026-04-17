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
  isActive: boolean
}

interface WarehouseBalance {
  warehouseId: string
  warehouseName: string
  warehouseCode: string
  balance: number
}

interface BalanceItem {
  id: string
  sku: string
  name: string
  unit: string
  byWarehouse: WarehouseBalance[]
}

interface TransferItem {
  stockItemId: string
  quantity: string
  sourceWarehouseId: string
  destinationWarehouseId: string
}

export default function TransferPage() {
  const router = useRouter()
  const [items, setItems] = useState<StockItem[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [balances, setBalances] = useState<BalanceItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [transferItems, setTransferItems] = useState<TransferItem[]>([
    { stockItemId: "", quantity: "", sourceWarehouseId: "", destinationWarehouseId: "" },
  ])

  useEffect(() => {
    const safeJson = (r: Response) => r.json().catch(() => null)
    Promise.all([
      fetch("/api/stock-items").then(safeJson),
      fetch("/api/warehouses").then(safeJson),
      fetch("/api/balances").then(safeJson),
    ]).then(([stockItems, wh, bal]) => {
      if (Array.isArray(stockItems)) setItems(stockItems)
      if (Array.isArray(wh)) setWarehouses(wh.filter((w: Warehouse) => w.isActive))
      if (Array.isArray(bal)) setBalances(bal)
    })
  }, [])

  function getAvailableBalance(stockItemId: string, warehouseId: string): number | null {
    if (!stockItemId || !warehouseId) return null
    const item = balances.find((b) => b.id === stockItemId)
    if (!item) return null
    const wh = item.byWarehouse.find((w) => w.warehouseId === warehouseId)
    return wh?.balance ?? 0
  }

  function updateItem(index: number, field: keyof TransferItem, value: string) {
    setTransferItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  function addItem() {
    setTransferItems((prev) => [
      ...prev,
      { stockItemId: "", quantity: "", sourceWarehouseId: "", destinationWarehouseId: "" },
    ])
  }

  function removeItem(index: number) {
    setTransferItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSuccess("")

    const validItems = transferItems.filter(
      (ti) => ti.stockItemId && ti.quantity && ti.sourceWarehouseId && ti.destinationWarehouseId
    )
    if (validItems.length === 0) {
      setError("Add at least one item with all fields filled.")
      return
    }

    for (const ti of validItems) {
      if (ti.sourceWarehouseId === ti.destinationWarehouseId) {
        const item = items.find((i) => i.id === ti.stockItemId)
        setError(`${item?.name || "Item"}: source and destination warehouse must be different.`)
        return
      }
    }

    setLoading(true)
    const form = e.currentTarget
    const data = {
      items: validItems.map((ti) => ({
        stockItemId: ti.stockItemId,
        quantity: parseInt(ti.quantity),
        sourceWarehouseId: ti.sourceWarehouseId,
        destinationWarehouseId: ti.destinationWarehouseId,
      })),
      notes: (form.elements.namedItem("notes") as HTMLTextAreaElement).value,
      reference: (form.elements.namedItem("reference") as HTMLInputElement).value,
    }
    const res = await fetch("/api/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    setLoading(false)
    if (!res.ok) {
      let message = "Failed to record transfer"
      try {
        const err = await res.json()
        message = err.error || message
      } catch {}
      setError(message)
    } else {
      setSuccess("Stock transfer recorded successfully!")
      setTransferItems([
        { stockItemId: "", quantity: "", sourceWarehouseId: "", destinationWarehouseId: "" },
      ])
      form.reset()
      const bal = await fetch("/api/balances").then((r) => r.json()).catch(() => null)
      if (Array.isArray(bal)) setBalances(bal)
    }
  }

  const inputCls = "mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Transfer Stock</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Move stock between warehouses.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <fieldset className="border border-gray-200 dark:border-gray-600 rounded-md p-4 space-y-4">
          <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 px-1">Transfer Items *</legend>
          {transferItems.map((ti, index) => {
            const available = getAvailableBalance(ti.stockItemId, ti.sourceWarehouseId)
            const selectedItem = items.find((i) => i.id === ti.stockItemId)
            return (
              <div key={index} className="space-y-2 pb-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 last:pb-0">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    {index === 0 && (
                      <label className="block text-xs text-gray-500 dark:text-gray-400">Stock Item</label>
                    )}
                    <select
                      value={ti.stockItemId}
                      onChange={(e) => updateItem(index, "stockItemId", e.target.value)}
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
                  <div className="w-24">
                    {index === 0 && (
                      <label className="block text-xs text-gray-500 dark:text-gray-400">Qty</label>
                    )}
                    <input
                      type="number"
                      min="1"
                      required
                      value={ti.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  {transferItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="mb-0.5 px-2 py-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                      title="Remove item"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    {index === 0 && (
                      <label className="block text-xs text-gray-500 dark:text-gray-400">From Warehouse</label>
                    )}
                    <select
                      value={ti.sourceWarehouseId}
                      onChange={(e) => updateItem(index, "sourceWarehouseId", e.target.value)}
                      required
                      className={inputCls}
                    >
                      <option value="">Source...</option>
                      {warehouses.map((wh) => (
                        <option key={wh.id} value={wh.id}>
                          {wh.code} — {wh.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    {index === 0 && (
                      <label className="block text-xs text-gray-500 dark:text-gray-400">To Warehouse</label>
                    )}
                    <select
                      value={ti.destinationWarehouseId}
                      onChange={(e) => updateItem(index, "destinationWarehouseId", e.target.value)}
                      required
                      className={inputCls}
                    >
                      <option value="">Destination...</option>
                      {warehouses.map((wh) => (
                        <option key={wh.id} value={wh.id}>
                          {wh.code} — {wh.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {available !== null && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Available at source: <span className={`font-medium ${available <= 0 ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"}`}>{available} {selectedItem?.unit || "units"}</span>
                  </div>
                )}
              </div>
            )
          })}
          <button
            type="button"
            onClick={addItem}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
          >
            + Add another item
          </button>
        </fieldset>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reference</label>
          <input
            name="reference"
            type="text"
            placeholder="e.g. TRF-001"
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
          <div className="rounded-md bg-green-50 dark:bg-green-900/30 p-3 text-sm text-green-700 dark:text-green-400">
            {success}
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Transferring..." : "Record Transfer"}
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
