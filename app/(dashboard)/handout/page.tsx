"use client"

import { useState, useEffect, useRef, FormEvent } from "react"
import { useRouter } from "next/navigation"
import { generatePickingListPdf } from "@/components/picking-list"
import type { PickingListData } from "@/components/picking-list"

interface StockItem {
  id: string
  sku: string
  name: string
  unit: string
  warehouse: { code: string; name: string } | null
  warehouseRow: { name: string } | null
  shelf: { name: string } | null
}

interface DataHall {
  id: string
  code: string
  name: string
  rows: Row[]
}

interface Row {
  id: string
  name: string
  racks: Rack[]
}

interface Rack {
  id: string
  name: string
}

interface Warehouse {
  id: string
  code: string
  name: string
}

interface SelectedItem {
  stockItemId: string
  quantity: string
}

export default function HandoutPage() {
  const router = useRouter()
  const [items, setItems] = useState<StockItem[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState("")
  const [dataHalls, setDataHalls] = useState<DataHall[]>([])
  const [selectedHall, setSelectedHall] = useState("")
  const [selectedRow, setSelectedRow] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [lastBatchId, setLastBatchId] = useState<string | null>(null)
  const [pickers, setPickers] = useState<string[]>([])
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([
    { stockItemId: "", quantity: "" },
  ])

  useEffect(() => {
    const safeJson = (r: Response) => r.json().catch(() => null)
    Promise.all([
      fetch("/api/stock-items").then(safeJson),
      fetch("/api/data-halls").then(safeJson),
      fetch("/api/pickers").then(safeJson),
      fetch("/api/warehouses").then(safeJson),
    ]).then(([stockItems, halls, pickerList, wh]) => {
      if (Array.isArray(stockItems)) setItems(stockItems)
      if (Array.isArray(halls)) setDataHalls(halls)
      if (Array.isArray(pickerList)) setPickers(pickerList)
      if (Array.isArray(wh)) setWarehouses(wh)
    })
  }, [])

  function formatStorageLocation(item: StockItem | null): string | null {
    if (!item) return null
    const parts = [
      item.warehouse?.name,
      item.warehouseRow?.name,
      item.shelf?.name,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(" -> ") : null
  }

  const rows = dataHalls.find((h) => h.id === selectedHall)?.rows || []
  const racks = rows.find((r) => r.id === selectedRow)?.racks || []

  function updateItem(index: number, field: keyof SelectedItem, value: string) {
    setSelectedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  function addItem() {
    setSelectedItems((prev) => [...prev, { stockItemId: "", quantity: "" }])
  }

  function removeItem(index: number) {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index))
  }

  const formRef = useRef<HTMLFormElement>(null)

  function buildPickingListData(): PickingListData | null {
    const validItems = selectedItems.filter((si) => si.stockItemId && si.quantity)
    if (validItems.length === 0) return null

    const form = formRef.current
    if (!form) return null

    const hall = dataHalls.find((h) => h.id === selectedHall)
    const row = hall?.rows.find((r) => r.id === selectedRow)
    const rackEl = form.elements.namedItem("rackId") as HTMLSelectElement
    const rack = row?.racks.find((r) => r.id === rackEl?.value)

    const destParts = [
      hall ? `${hall.code} - ${hall.name}` : "",
      row ? row.name : "",
      rack ? rack.name : "",
    ].filter(Boolean)

    const sourceWh = warehouses.find((w) => w.id === selectedWarehouse)

    return {
      date: new Date().toLocaleDateString(),
      picker: (form.elements.namedItem("pickedBy") as HTMLInputElement).value || "-",
      destination: destParts.join(" -> ") || "-",
      reference: (form.elements.namedItem("reference") as HTMLInputElement).value || "",
      notes: (form.elements.namedItem("notes") as HTMLTextAreaElement).value || "",
      sourceWarehouse: sourceWh ? `${sourceWh.code} — ${sourceWh.name}` : undefined,
      items: validItems.map((si) => {
        const item = items.find((i) => i.id === si.stockItemId)
        return {
          sku: item?.sku || "-",
          name: item?.name || "-",
          quantity: parseInt(si.quantity) || 0,
          unit: item?.unit || "units",
          storageLocation: formatStorageLocation(item || null),
        }
      }),
    }
  }

  function handlePreviewPickingList() {
    const data = buildPickingListData()
    if (!data) {
      setError("Select at least one item with a quantity to preview the stock handout.")
      return
    }
    if (!selectedHall) {
      setError("Select a destination before previewing the stock handout.")
      return
    }
    setError("")
    const doc = generatePickingListPdf(data)
    const blob = doc.output("blob")
    const url = URL.createObjectURL(blob)
    window.open(url, "_blank")
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSuccess("")

    const validItems = selectedItems.filter((si) => si.stockItemId && si.quantity)
    if (validItems.length === 0) {
      setError("Add at least one item with a quantity.")
      return
    }

    setLoading(true)
    const form = e.currentTarget
    const data = {
      type: "HANDOUT",
      items: validItems.map((si) => ({
        stockItemId: si.stockItemId,
        quantity: parseInt(si.quantity),
      })),
      pickedBy: (form.elements.namedItem("pickedBy") as HTMLInputElement).value,
      dataHallId: selectedHall,
      rowId: selectedRow,
      rackId: (form.elements.namedItem("rackId") as HTMLSelectElement).value,
      reference: (form.elements.namedItem("reference") as HTMLInputElement).value,
      notes: (form.elements.namedItem("notes") as HTMLTextAreaElement).value,
      sourceWarehouseId: selectedWarehouse || undefined,
    }
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    setLoading(false)
    if (!res.ok) {
      let message = "Failed to record handout"
      try {
        const err = await res.json()
        message = err.error || message
      } catch {}
      setError(message)
    } else {
      const result = await res.json()
      setLastBatchId(result.batchId ?? null)
      setSuccess("Stock handout recorded successfully!")
      setSelectedItems([{ stockItemId: "", quantity: "" }])
      form.reset()
      setSelectedWarehouse("")
      setSelectedHall("")
      setSelectedRow("")
    }
  }

  async function handleReprintPickingList(batchId: string) {
    const res = await fetch(`/api/transactions/batch/${batchId}`)
    if (!res.ok) {
      setError("Failed to load batch for reprint.")
      return
    }
    const { transactions } = await res.json()
    const first = transactions[0]
    const destParts = [
      first.dataHall ? `${first.dataHall.code} - ${first.dataHall.name}` : "",
      first.row ? first.row.name : "",
      first.rack ? first.rack.name : "",
    ].filter(Boolean)

    const sourceWh = first.sourceWarehouse
    const data: PickingListData = {
      date: new Date(first.createdAt).toLocaleDateString(),
      picker: first.pickedBy || "-",
      destination: destParts.join(" -> ") || "-",
      reference: first.reference || "",
      notes: first.notes || "",
      sourceWarehouse: sourceWh ? `${sourceWh.code} — ${sourceWh.name}` : undefined,
      items: transactions.map((t: { stockItem: { sku: string; name: string; unit: string; warehouse: { name: string } | null; warehouseRow: { name: string } | null; shelf: { name: string } | null }; quantity: number }) => {
        const loc = [t.stockItem.warehouse?.name, t.stockItem.warehouseRow?.name, t.stockItem.shelf?.name].filter(Boolean)
        return {
          sku: t.stockItem.sku,
          name: t.stockItem.name,
          quantity: t.quantity,
          unit: t.stockItem.unit,
          storageLocation: loc.length > 0 ? loc.join(" -> ") : null,
        }
      }),
    }
    const doc = generatePickingListPdf(data)
    const blob = doc.output("blob")
    const url = URL.createObjectURL(blob)
    window.open(url, "_blank")
  }

  const inputCls = "mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
  const inputClsDisabled = `${inputCls} disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500`

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Hand Out Stock</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Record stock being issued to a destination.</p>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Source Warehouse *</label>
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
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

        <fieldset className="border border-gray-200 dark:border-gray-600 rounded-md p-4 space-y-3">
          <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 px-1">Items *</legend>
          {selectedItems.map((si, index) => (
            <div key={index} className="flex gap-2 items-end">
              <div className="flex-1">
                {index === 0 && (
                  <label className="block text-xs text-gray-500 dark:text-gray-400">Stock Item</label>
                )}
                <select
                  value={si.stockItemId}
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
                  value={si.quantity}
                  onChange={(e) => updateItem(index, "quantity", e.target.value)}
                  className={inputCls}
                />
              </div>
              {selectedItems.length > 1 && (
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
          ))}
          <button
            type="button"
            onClick={addItem}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
          >
            + Add another item
          </button>
        </fieldset>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Picked By *</label>
          <input
            name="pickedBy"
            required
            list="pickersList"
            placeholder="Type or select picker..."
            autoComplete="off"
            className={`${inputCls} placeholder-gray-400 dark:placeholder-gray-500`}
          />
          <datalist id="pickersList">
            {pickers.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>

        <fieldset className="border border-gray-200 dark:border-gray-600 rounded-md p-4 space-y-3">
          <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 px-1">Destination *</legend>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Data Hall</label>
            <select
              required
              value={selectedHall}
              onChange={(e) => {
                setSelectedHall(e.target.value)
                setSelectedRow("")
              }}
              className={inputCls}
            >
              <option value="">Select data hall...</option>
              {dataHalls.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.code} — {h.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Row</label>
            <select
              required
              value={selectedRow}
              onChange={(e) => setSelectedRow(e.target.value)}
              disabled={!selectedHall}
              className={inputClsDisabled}
            >
              <option value="">Select row...</option>
              {rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Rack</label>
            <select
              name="rackId"
              required
              disabled={!selectedRow}
              className={inputClsDisabled}
            >
              <option value="">Select rack...</option>
              {racks.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </fieldset>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Job Reference</label>
          <input
            name="reference"
            type="text"
            placeholder="e.g. JOB-456"
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
          <div className="rounded-md bg-green-50 dark:bg-green-900/30 p-3 text-sm text-green-700 dark:text-green-400 flex items-center justify-between gap-2">
            <span>{success}</span>
            {lastBatchId && (
              <button
                type="button"
                onClick={() => handleReprintPickingList(lastBatchId)}
                className="shrink-0 px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700"
              >
                Print Stock Handout
              </button>
            )}
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Recording..." : "Record Handout"}
          </button>
          <button
            type="button"
            onClick={handlePreviewPickingList}
            disabled={loading || selectedItems.every((si) => !si.stockItemId || !si.quantity) || !selectedHall}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Preview Stock Handout
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
