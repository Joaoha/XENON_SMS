"use client"

import { useState, useEffect } from "react"

interface StockItem {
  id: string
  sku: string
  name: string
  unit: string
}

interface ProfileItem {
  id: string
  stockItemId: string
  quantity: number
  stockItem: StockItem
}

interface Profile {
  id: string
  name: string
  description: string | null
  items: ProfileItem[]
}

interface FormItem {
  stockItemId: string
  quantity: string
}

export default function HandoutProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [formItems, setFormItems] = useState<FormItem[]>([{ stockItemId: "", quantity: "" }])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [profilesRes, itemsRes] = await Promise.all([
      fetch("/api/handout-profiles").then((r) => r.json()),
      fetch("/api/stock-items").then((r) => r.json()),
    ])
    if (Array.isArray(profilesRes)) setProfiles(profilesRes)
    if (Array.isArray(itemsRes)) setStockItems(itemsRes)
  }

  function resetForm() {
    setName("")
    setDescription("")
    setFormItems([{ stockItemId: "", quantity: "" }])
    setEditingId(null)
  }

  function startEdit(profile: Profile) {
    setEditingId(profile.id)
    setName(profile.name)
    setDescription(profile.description || "")
    setFormItems(
      profile.items.map((i) => ({
        stockItemId: i.stockItemId,
        quantity: String(i.quantity),
      }))
    )
    setError("")
    setSuccess("")
  }

  function updateFormItem(index: number, field: keyof FormItem, value: string) {
    setFormItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  function addFormItem() {
    setFormItems((prev) => [...prev, { stockItemId: "", quantity: "" }])
  }

  function removeFormItem(index: number) {
    setFormItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")

    const validItems = formItems.filter((i) => i.stockItemId && i.quantity)
    if (validItems.length === 0) {
      setError("Add at least one item with a quantity.")
      return
    }

    const ids = validItems.map((i) => i.stockItemId)
    if (new Set(ids).size !== ids.length) {
      setError("Each item can only appear once in a profile.")
      return
    }

    setLoading(true)
    const payload = {
      name,
      description: description || null,
      items: validItems.map((i) => ({
        stockItemId: i.stockItemId,
        quantity: parseInt(i.quantity),
      })),
    }

    const url = editingId ? `/api/handout-profiles/${editingId}` : "/api/handout-profiles"
    const method = editingId ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    setLoading(false)

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Request failed" }))
      setError(err.error || "Request failed")
      return
    }

    setSuccess(editingId ? "Profile updated." : "Profile created.")
    resetForm()
    loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this profile?")) return
    const res = await fetch(`/api/handout-profiles/${id}`, { method: "DELETE" })
    if (res.ok) {
      loadData()
      if (editingId === id) resetForm()
    }
  }

  const inputCls =
    "mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Handout Profiles</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Create reusable templates with preset items and quantities for handouts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {editingId ? "Edit Profile" : "Create Profile"}
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Standard Rack Build"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className={inputCls}
            />
          </div>

          <fieldset className="border border-gray-200 dark:border-gray-600 rounded-md p-4 space-y-3">
            <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 px-1">Items *</legend>
            {formItems.map((fi, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1">
                  {index === 0 && (
                    <label className="block text-xs text-gray-500 dark:text-gray-400">Stock Item</label>
                  )}
                  <select
                    value={fi.stockItemId}
                    onChange={(e) => updateFormItem(index, "stockItemId", e.target.value)}
                    required
                    className={inputCls}
                  >
                    <option value="">Select item...</option>
                    {stockItems
                      .filter((item) => item.id === fi.stockItemId || !formItems.some((other, oi) => oi !== index && other.stockItemId === item.id))
                      .map((item) => (
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
                    value={fi.quantity}
                    onChange={(e) => updateFormItem(index, "quantity", e.target.value)}
                    className={inputCls}
                  />
                </div>
                {formItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeFormItem(index)}
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
              onClick={addFormItem}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              + Add another item
            </button>
          </fieldset>

          {error && <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-400">{error}</div>}
          {success && <div className="rounded-md bg-green-50 dark:bg-green-900/30 p-3 text-sm text-green-700 dark:text-green-400">{success}</div>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : editingId ? "Update Profile" : "Create Profile"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Existing Profiles</h2>
          {profiles.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No profiles yet.</p>
          )}
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">{profile.name}</h3>
                  {profile.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{profile.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(profile)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(profile.id)}
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
                {profile.items.map((item) => (
                  <li key={item.id}>
                    [{item.stockItem.sku}] {item.stockItem.name} — {item.quantity} {item.stockItem.unit}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
