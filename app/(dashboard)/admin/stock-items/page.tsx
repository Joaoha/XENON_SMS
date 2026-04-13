"use client"

import { useState, useEffect } from "react"

interface StockItem {
  id: string
  sku: string
  name: string
  description: string | null
  unit: string
  isActive: boolean
}

export default function StockItemsAdminPage() {
  const [items, setItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ sku: "", name: "", description: "", unit: "units" })
  const [editing, setEditing] = useState<StockItem | null>(null)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  async function loadItems() {
    const res = await fetch("/api/stock-items")
    setItems(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    loadItems()
  }, [])

  async function handleSave() {
    setError("")
    setSaving(true)
    const url = editing ? `/api/stock-items/${editing.id}` : "/api/stock-items"
    const method = editing ? "PUT" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) {
      const err = await res.json()
      setError(err.error || "Failed to save")
    } else {
      setForm({ sku: "", name: "", description: "", unit: "units" })
      setEditing(null)
      loadItems()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deactivate this item?")) return
    await fetch(`/api/stock-items/${id}`, { method: "DELETE" })
    loadItems()
  }

  function startEdit(item: StockItem) {
    setEditing(item)
    setForm({ sku: item.sku, name: item.name, description: item.description || "", unit: item.unit })
  }

  const UNIT_OPTIONS = [
    { value: "units", label: "Units — individual items like cables, switches, brackets" },
    { value: "box", label: "box — Box" },
    { value: "pack", label: "pack — Pack" },
    { value: "roll", label: "roll — Roll" },
    { value: "m", label: "m — Meter" },
    { value: "kg", label: "kg — Kilogram" },
    { value: "l", label: "l — Litre" },
    { value: "pair", label: "pair — Pair" },
    { value: "set", label: "set — Set" },
  ]

  const inputCls = "mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Stock Items</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4 max-w-lg">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200">{editing ? "Edit Item" : "Add New Item"}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">SKU *</label>
            <input
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
              className={inputCls}
              placeholder="SKU-001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unit</label>
            <select
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              className={inputCls}
            >
              {UNIT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name *</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={inputCls}
            placeholder="Cable Patch 1U"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <input
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className={inputCls}
          />
        </div>
        {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !form.sku || !form.name}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : editing ? "Update" : "Add Item"}
          </button>
          {editing && (
            <button
              onClick={() => {
                setEditing(null)
                setForm({ sku: "", name: "", description: "", unit: "units" })
              }}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500 dark:text-gray-400 text-sm">Loading...</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Unit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400">{item.sku}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{item.name}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.unit}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.description || "—"}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => startEdit(item)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-xs"
                    >
                      Remove
                    </button>
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
