"use client"

import { useState, useEffect, FormEvent } from "react"
import { useRouter } from "next/navigation"

interface StockItem {
  id: string
  sku: string
  name: string
  unit: string
}

interface DataHall {
  id: string
  code: string
  name: string
  rows: Row[]
}

interface Row {
  id: string
  code: string
  name: string
  racks: Rack[]
}

interface Rack {
  id: string
  code: string
  name: string
}

export default function HandoutPage() {
  const router = useRouter()
  const [items, setItems] = useState<StockItem[]>([])
  const [dataHalls, setDataHalls] = useState<DataHall[]>([])
  const [selectedHall, setSelectedHall] = useState("")
  const [selectedRow, setSelectedRow] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    Promise.all([
      fetch("/api/stock-items").then((r) => r.json()),
      fetch("/api/data-halls").then((r) => r.json()),
    ]).then(([stockItems, halls]) => {
      setItems(stockItems)
      setDataHalls(halls)
    })
  }, [])

  const rows = dataHalls.find((h) => h.id === selectedHall)?.rows || []
  const racks = rows.find((r) => r.id === selectedRow)?.racks || []

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)
    const form = e.currentTarget
    const data = {
      type: "HANDOUT",
      stockItemId: (form.elements.namedItem("stockItemId") as HTMLSelectElement).value,
      quantity: parseInt((form.elements.namedItem("quantity") as HTMLInputElement).value),
      pickedBy: (form.elements.namedItem("pickedBy") as HTMLInputElement).value,
      dataHallId: selectedHall,
      rowId: selectedRow,
      rackId: (form.elements.namedItem("rackId") as HTMLSelectElement).value,
      reference: (form.elements.namedItem("reference") as HTMLInputElement).value,
      notes: (form.elements.namedItem("notes") as HTMLTextAreaElement).value,
    }
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    setLoading(false)
    if (!res.ok) {
      const err = await res.json()
      setError(err.error || "Failed to record handout")
    } else {
      setSuccess("Stock handout recorded successfully!")
      form.reset()
      setSelectedHall("")
      setSelectedRow("")
    }
  }

  const inputCls = "mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
  const inputClsDisabled = `${inputCls} disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500`

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Hand Out Stock</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Record stock being issued to a destination.</p>
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

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Picked By *</label>
          <input
            name="pickedBy"
            type="text"
            required
            placeholder="Name of person picking stock"
            className={`${inputCls} placeholder-gray-400 dark:placeholder-gray-500`}
          />
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
                  {r.code} — {r.name}
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
                  {r.code} — {r.name}
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
          <div className="rounded-md bg-green-50 dark:bg-green-900/30 p-3 text-sm text-green-700 dark:text-green-400">{success}</div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Recording..." : "Record Handout"}
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
