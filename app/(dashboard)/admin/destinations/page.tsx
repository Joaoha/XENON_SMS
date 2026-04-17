"use client"

import { useState, useEffect } from "react"

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

export default function DestinationsPage() {
  const [halls, setHalls] = useState<DataHall[]>([])
  const [loading, setLoading] = useState(true)
  const [hallForm, setHallForm] = useState({ name: "", code: "" })
  const [rowForm, setRowForm] = useState({ name: "", dataHallId: "" })
  const [rackForm, setRackForm] = useState({ name: "", rowId: "", dataHallId: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function loadHalls() {
    const res = await fetch("/api/data-halls")
    setHalls(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    loadHalls()
  }, [])

  async function addHall() {
    if (!hallForm.name || !hallForm.code) return
    setSaving(true)
    setError("")
    const res = await fetch("/api/data-halls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hallForm),
    })
    setSaving(false)
    if (!res.ok) {
      setError((await res.json()).error || "Failed")
    } else {
      setHallForm({ name: "", code: "" })
      loadHalls()
    }
  }

  async function addRow() {
    if (!rowForm.name || !rowForm.dataHallId) return
    setSaving(true)
    setError("")
    const res = await fetch(`/api/data-halls/${rowForm.dataHallId}/rows`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: rowForm.name }),
    })
    setSaving(false)
    if (!res.ok) {
      setError((await res.json()).error || "Failed")
    } else {
      setRowForm((f) => ({ ...f, name: "" }))
      loadHalls()
    }
  }

  async function addRack() {
    if (!rackForm.name || !rackForm.rowId) return
    setSaving(true)
    setError("")
    const res = await fetch(`/api/data-halls/${rackForm.dataHallId}/rows/${rackForm.rowId}/racks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: rackForm.name }),
    })
    setSaving(false)
    if (!res.ok) {
      setError((await res.json()).error || "Failed")
    } else {
      setRackForm((f) => ({ ...f, name: "" }))
      loadHalls()
    }
  }

  async function removeHall(id: string, name: string) {
    if (!confirm(`Remove data hall "${name}"?`)) return
    setError("")
    const res = await fetch(`/api/data-halls/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      setError(err?.error || "Failed to remove")
    } else {
      loadHalls()
    }
  }

  async function removeRow(hallId: string, rowId: string, name: string) {
    if (!confirm(`Remove row "${name}"?`)) return
    setError("")
    const res = await fetch(`/api/data-halls/${hallId}/rows/${rowId}`, { method: "DELETE" })
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      setError(err?.error || "Failed to remove")
    } else {
      loadHalls()
    }
  }

  async function removeRack(hallId: string, rowId: string, rackId: string, name: string) {
    if (!confirm(`Remove rack "${name}"?`)) return
    setError("")
    const res = await fetch(`/api/data-halls/${hallId}/rows/${rowId}/racks/${rackId}`, { method: "DELETE" })
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      setError(err?.error || "Failed to remove")
    } else {
      loadHalls()
    }
  }

  const selectedHallRows = halls.find((h) => h.id === rackForm.dataHallId)?.rows || []

  const inputCls = "mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm"
  const inputClsDisabled = `${inputCls} disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500`
  const removeBtnCls = "ml-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs"

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Destinations</h1>

      {error && <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-400">{error}</div>}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Add Data Hall */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 space-y-3">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200">Add Data Hall</h2>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Code</label>
            <input
              value={hallForm.code}
              onChange={(e) => setHallForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="DH1"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Name</label>
            <input
              value={hallForm.name}
              onChange={(e) => setHallForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Data Hall 1"
              className={inputCls}
            />
          </div>
          <button
            onClick={addHall}
            disabled={saving || !hallForm.code || !hallForm.name}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>

        {/* Add Row */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 space-y-3">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200">Add Row</h2>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Data Hall</label>
            <select
              value={rowForm.dataHallId}
              onChange={(e) => setRowForm((f) => ({ ...f, dataHallId: e.target.value }))}
              className={inputCls}
            >
              <option value="">Select...</option>
              {halls.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.code} — {h.name}
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
            disabled={saving || !rowForm.name || !rowForm.dataHallId}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>

        {/* Add Rack */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 space-y-3">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200">Add Rack</h2>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Data Hall</label>
            <select
              value={rackForm.dataHallId}
              onChange={(e) => setRackForm((f) => ({ ...f, dataHallId: e.target.value, rowId: "" }))}
              className={inputCls}
            >
              <option value="">Select...</option>
              {halls.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.code} — {h.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Row</label>
            <select
              value={rackForm.rowId}
              onChange={(e) => setRackForm((f) => ({ ...f, rowId: e.target.value }))}
              disabled={!rackForm.dataHallId}
              className={inputClsDisabled}
            >
              <option value="">Select...</option>
              {selectedHallRows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400">Name</label>
            <input
              value={rackForm.name}
              onChange={(e) => setRackForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Rack 01"
              className={inputCls}
            />
          </div>
          <button
            onClick={addRack}
            disabled={saving || !rackForm.name || !rackForm.rowId}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      {/* Hierarchy view */}
      {!loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200">Current Hierarchy</h2>
          {halls.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No destinations configured yet.</p>
          ) : (
            <div className="space-y-4">
              {halls.map((hall) => (
                <div key={hall.id}>
                  <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center">
                    <span>🏢 {hall.code} — {hall.name}</span>
                    <button onClick={() => removeHall(hall.id, hall.name)} className={removeBtnCls}>Remove</button>
                  </div>
                  <div className="ml-6 space-y-1 mt-1">
                    {hall.rows.map((row) => (
                      <div key={row.id}>
                        <div className="text-sm text-gray-700 dark:text-gray-300 flex items-center">
                          <span>↳ Row: {row.name}</span>
                          <button onClick={() => removeRow(hall.id, row.id, row.name)} className={removeBtnCls}>Remove</button>
                        </div>
                        <div className="ml-6 flex flex-wrap gap-1 mt-0.5">
                          {row.racks.map((rack) => (
                            <span
                              key={rack.id}
                              className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded inline-flex items-center gap-1"
                            >
                              {rack.name}
                              <button onClick={() => removeRack(hall.id, row.id, rack.id, rack.name)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">&times;</button>
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
