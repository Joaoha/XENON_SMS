"use client"

import { useState, useEffect } from "react"

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

export default function StorageLocationsPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [whForm, setWhForm] = useState({ name: "", code: "" })
  const [rowForm, setRowForm] = useState({ name: "", warehouseId: "" })
  const [shelfForm, setShelfForm] = useState({ name: "", rowId: "", warehouseId: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/warehouses")
      .then((r) => r.json().catch(() => null))
      .then((data) => {
        if (Array.isArray(data)) setWarehouses(data)
        setLoading(false)
      })
  }, [])

  async function loadWarehouses() {
    const res = await fetch("/api/warehouses")
    const data = await res.json().catch(() => null)
    if (Array.isArray(data)) setWarehouses(data)
    setLoading(false)
  }

  async function addWarehouse() {
    if (!whForm.name || !whForm.code) return
    setSaving(true)
    setError("")
    const res = await fetch("/api/warehouses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(whForm),
    })
    setSaving(false)
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      setError(err?.error || "Failed")
    } else {
      setWhForm({ name: "", code: "" })
      loadWarehouses()
    }
  }

  async function addRow() {
    if (!rowForm.name || !rowForm.warehouseId) return
    setSaving(true)
    setError("")
    const res = await fetch(`/api/warehouses/${rowForm.warehouseId}/rows`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: rowForm.name }),
    })
    setSaving(false)
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      setError(err?.error || "Failed")
    } else {
      setRowForm((f) => ({ ...f, name: "" }))
      loadWarehouses()
    }
  }

  async function addShelf() {
    if (!shelfForm.name || !shelfForm.rowId) return
    setSaving(true)
    setError("")
    const res = await fetch(`/api/warehouses/${shelfForm.warehouseId}/rows/${shelfForm.rowId}/shelves`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: shelfForm.name }),
    })
    setSaving(false)
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      setError(err?.error || "Failed")
    } else {
      setShelfForm((f) => ({ ...f, name: "" }))
      loadWarehouses()
    }
  }

  async function removeWarehouse(id: string, name: string) {
    if (!confirm(`Remove warehouse "${name}"?`)) return
    setError("")
    const res = await fetch(`/api/warehouses/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      setError(err?.error || "Failed to remove")
    } else {
      loadWarehouses()
    }
  }

  async function removeRow(whId: string, rowId: string, name: string) {
    if (!confirm(`Remove row "${name}"?`)) return
    setError("")
    const res = await fetch(`/api/warehouses/${whId}/rows/${rowId}`, { method: "DELETE" })
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      setError(err?.error || "Failed to remove")
    } else {
      loadWarehouses()
    }
  }

  async function removeShelf(whId: string, rowId: string, shelfId: string, name: string) {
    if (!confirm(`Remove shelf "${name}"?`)) return
    setError("")
    const res = await fetch(`/api/warehouses/${whId}/rows/${rowId}/shelves/${shelfId}`, { method: "DELETE" })
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      setError(err?.error || "Failed to remove")
    } else {
      loadWarehouses()
    }
  }

  const selectedWhRows = warehouses.find((w) => w.id === shelfForm.warehouseId)?.rows || []

  const inputCls = "mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm"
  const inputClsDisabled = `${inputCls} disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500`
  const removeBtnCls = "ml-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs"

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Storage Locations</h1>

      {error && <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-400">{error}</div>}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 space-y-3">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200">Add Warehouse</h2>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Code</label>
            <input
              value={whForm.code}
              onChange={(e) => setWhForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="WH1"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Name</label>
            <input
              value={whForm.name}
              onChange={(e) => setWhForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Main Warehouse"
              className={inputCls}
            />
          </div>
          <button
            onClick={addWarehouse}
            disabled={saving || !whForm.code || !whForm.name}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 space-y-3">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200">Add Row</h2>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Warehouse</label>
            <select
              value={rowForm.warehouseId}
              onChange={(e) => setRowForm((f) => ({ ...f, warehouseId: e.target.value }))}
              className={inputCls}
            >
              <option value="">Select...</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} — {w.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Name</label>
            <input
              value={rowForm.name}
              onChange={(e) => setRowForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Row A"
              className={inputCls}
            />
          </div>
          <button
            onClick={addRow}
            disabled={saving || !rowForm.name || !rowForm.warehouseId}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 space-y-3">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200">Add Shelf</h2>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Warehouse</label>
            <select
              value={shelfForm.warehouseId}
              onChange={(e) => setShelfForm((f) => ({ ...f, warehouseId: e.target.value, rowId: "" }))}
              className={inputCls}
            >
              <option value="">Select...</option>
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
              value={shelfForm.rowId}
              onChange={(e) => setShelfForm((f) => ({ ...f, rowId: e.target.value }))}
              disabled={!shelfForm.warehouseId}
              className={inputClsDisabled}
            >
              <option value="">Select...</option>
              {selectedWhRows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Name</label>
            <input
              value={shelfForm.name}
              onChange={(e) => setShelfForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Shelf 01"
              className={inputCls}
            />
          </div>
          <button
            onClick={addShelf}
            disabled={saving || !shelfForm.name || !shelfForm.rowId}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      {!loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200">Current Hierarchy</h2>
          {warehouses.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No storage locations configured yet.</p>
          ) : (
            <div className="space-y-4">
              {warehouses.map((wh) => (
                <div key={wh.id}>
                  <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center">
                    <span>{wh.code} — {wh.name}</span>
                    <button onClick={() => removeWarehouse(wh.id, wh.name)} className={removeBtnCls}>Remove</button>
                  </div>
                  <div className="ml-6 space-y-1 mt-1">
                    {wh.rows.map((row) => (
                      <div key={row.id}>
                        <div className="text-sm text-gray-700 dark:text-gray-300 flex items-center">
                          <span>Row: {row.name}</span>
                          <button onClick={() => removeRow(wh.id, row.id, row.name)} className={removeBtnCls}>Remove</button>
                        </div>
                        <div className="ml-6 flex flex-wrap gap-1 mt-0.5">
                          {row.shelves.map((shelf) => (
                            <span
                              key={shelf.id}
                              className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded inline-flex items-center gap-1"
                            >
                              {shelf.name}
                              <button onClick={() => removeShelf(wh.id, row.id, shelf.id, shelf.name)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">&times;</button>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
