"use client"

import { useState, useEffect, useCallback } from "react"

interface Transaction {
  id: string
  type: "RECEIVE" | "HANDOUT"
  quantity: number
  pickedBy: string | null
  reference: string | null
  createdAt: string
  stockItem: { sku: string; name: string; unit: string }
  user: { username: string }
  dataHall: { code: string; name: string } | null
  row: { id: string; name: string } | null
  rack: { id: string; name: string } | null
}

interface StockItem {
  id: string
  sku: string
  name: string
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

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [items, setItems] = useState<StockItem[]>([])
  const [dataHalls, setDataHalls] = useState<DataHall[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ from: "", to: "", itemId: "", type: "HANDOUT" })
  const [scope, setScope] = useState<"" | "row" | "rack" | "hall">("")
  const [selectedHallIds, setSelectedHallIds] = useState<string[]>([])
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([])
  const [selectedRackIds, setSelectedRackIds] = useState<string[]>([])
  const [hallSearch, setHallSearch] = useState("")
  const [rowSearch, setRowSearch] = useState("")
  const [rackSearch, setRackSearch] = useState("")

  useEffect(() => {
    fetch("/api/stock-items")
      .then((r) => r.json())
      .then(setItems)
    fetch("/api/data-halls")
      .then((r) => r.json())
      .then((dh) => { if (Array.isArray(dh)) setDataHalls(dh) })
  }, [])

  const hallSource = selectedHallIds.length > 0
    ? dataHalls.filter((dh) => selectedHallIds.includes(dh.id))
    : scope !== "" ? dataHalls : []
  const availableRows: Row[] = hallSource.flatMap((dh) => dh.rows)
  const availableRacks: Rack[] = availableRows
    .filter((r) => selectedRowIds.length === 0 || selectedRowIds.includes(r.id))
    .flatMap((r) => r.racks)
  const filteredHalls = hallSearch
    ? dataHalls.filter((dh) => `${dh.code} ${dh.name}`.toLowerCase().includes(hallSearch.toLowerCase()))
    : dataHalls
  const filteredRows = rowSearch
    ? availableRows.filter((r) => r.name.toLowerCase().includes(rowSearch.toLowerCase()))
    : availableRows
  const filteredRacks = rackSearch
    ? availableRacks.filter((r) => r.name.toLowerCase().includes(rackSearch.toLowerCase()))
    : availableRacks

  const run = useCallback(async () => {
    if (!filters.from && !filters.to) return
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.itemId) params.set("itemId", filters.itemId)
    if (filters.type) params.set("type", filters.type)
    if (filters.from) params.set("from", filters.from)
    if (filters.to) params.set("to", filters.to)
    if (selectedHallIds.length > 0) params.set("dataHallIds", selectedHallIds.join(","))
    if (selectedRowIds.length > 0) params.set("rowIds", selectedRowIds.join(","))
    if (selectedRackIds.length > 0) params.set("rackIds", selectedRackIds.join(","))
    params.set("limit", "1000")
    const res = await fetch(`/api/transactions?${params}`)
    const data = await res.json()
    setTransactions(data.transactions ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [filters, selectedHallIds, selectedRowIds, selectedRackIds])

  // Aggregate by person
  const byPerson: Record<string, { name: string; qty: number; items: Record<string, number> }> = {}
  const byDestination: Record<string, { label: string; qty: number }> = {}
  const byItem: Record<string, { name: string; sku: string; unit: string; qty: number }> = {}
  const byRow: Record<string, { name: string; qty: number; items: Record<string, { name: string; sku: string; unit: string; qty: number }> }> = {}
  const byRack: Record<string, { name: string; rowName: string; qty: number; items: Record<string, { name: string; sku: string; unit: string; qty: number }> }> = {}
  const byHall: Record<string, { code: string; name: string; qty: number; items: Record<string, { name: string; sku: string; unit: string; qty: number }> }> = {}

  for (const t of transactions) {
    if (t.pickedBy) {
      if (!byPerson[t.pickedBy]) byPerson[t.pickedBy] = { name: t.pickedBy, qty: 0, items: {} }
      byPerson[t.pickedBy].qty += t.quantity
      byPerson[t.pickedBy].items[t.stockItem.name] =
        (byPerson[t.pickedBy].items[t.stockItem.name] || 0) + t.quantity
    }
    if (t.dataHall) {
      const parts = [t.dataHall.code, t.row?.name, t.rack?.name].filter(Boolean)
      const key = parts.join(" / ")
      if (!byDestination[key]) byDestination[key] = { label: key, qty: 0 }
      byDestination[key].qty += t.quantity
    }
    const itemKey = t.stockItem.sku
    if (!byItem[itemKey])
      byItem[itemKey] = { name: t.stockItem.name, sku: t.stockItem.sku, unit: t.stockItem.unit, qty: 0 }
    byItem[itemKey].qty += t.quantity

    if (t.row) {
      if (!byRow[t.row.id]) byRow[t.row.id] = { name: t.row.name, qty: 0, items: {} }
      byRow[t.row.id].qty += t.quantity
      const rk = t.stockItem.sku
      if (!byRow[t.row.id].items[rk])
        byRow[t.row.id].items[rk] = { name: t.stockItem.name, sku: t.stockItem.sku, unit: t.stockItem.unit, qty: 0 }
      byRow[t.row.id].items[rk].qty += t.quantity
    }

    if (t.rack) {
      if (!byRack[t.rack.id]) byRack[t.rack.id] = { name: t.rack.name, rowName: t.row?.name ?? "", qty: 0, items: {} }
      byRack[t.rack.id].qty += t.quantity
      const rk = t.stockItem.sku
      if (!byRack[t.rack.id].items[rk])
        byRack[t.rack.id].items[rk] = { name: t.stockItem.name, sku: t.stockItem.sku, unit: t.stockItem.unit, qty: 0 }
      byRack[t.rack.id].items[rk].qty += t.quantity
    }

    if (t.dataHall) {
      const hallKey = t.dataHall.code
      if (!byHall[hallKey]) byHall[hallKey] = { code: t.dataHall.code, name: t.dataHall.name, qty: 0, items: {} }
      byHall[hallKey].qty += t.quantity
      const ik = t.stockItem.sku
      if (!byHall[hallKey].items[ik])
        byHall[hallKey].items[ik] = { name: t.stockItem.name, sku: t.stockItem.sku, unit: t.stockItem.unit, qty: 0 }
      byHall[hallKey].items[ik].qty += t.quantity
    }
  }

  const exportUrl = () => {
    const params = new URLSearchParams()
    if (filters.type) params.set("type", filters.type)
    if (filters.itemId) params.set("itemId", filters.itemId)
    if (filters.from) params.set("from", filters.from)
    if (filters.to) params.set("to", filters.to)
    if (selectedHallIds.length > 0) params.set("dataHallIds", selectedHallIds.join(","))
    if (selectedRowIds.length > 0) params.set("rowIds", selectedRowIds.join(","))
    if (selectedRackIds.length > 0) params.set("rackIds", selectedRackIds.join(","))
    return `/api/export?${params}`
  }

  const filterSelectCls = "w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm"
  const multiSelectCls = "w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm"

  const toggleId = (ids: string[], id: string) =>
    ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reports</h1>
        {transactions.length > 0 && (
          <a
            href={exportUrl()}
            className="px-4 py-2 bg-gray-700 dark:bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-500"
          >
            Export CSV
          </a>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
        <h2 className="font-medium text-gray-700 dark:text-gray-300">Filter Transactions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
              className={filterSelectCls}
            >
              <option value="">All types</option>
              <option value="RECEIVE">Receive</option>
              <option value="HANDOUT">Handout</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Stock Item</label>
            <select
              value={filters.itemId}
              onChange={(e) => setFilters((f) => ({ ...f, itemId: e.target.value }))}
              className={filterSelectCls}
            >
              <option value="">All items</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sku}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">From Date</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              className={filterSelectCls}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">To Date</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              className={filterSelectCls}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Report Scope</label>
            <select
              value={scope}
              onChange={(e) => {
                setScope(e.target.value as "" | "row" | "rack" | "hall")
                setSelectedHallIds([])
                setSelectedRowIds([])
                setSelectedRackIds([])
                setHallSearch("")
                setRowSearch("")
                setRackSearch("")
              }}
              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm"
            >
              <option value="">Default (all views)</option>
              <option value="hall">By Data Hall</option>
              <option value="row">By Row</option>
              <option value="rack">By Rack</option>
            </select>
          </div>

          {scope !== "" && dataHalls.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Data Hall {selectedHallIds.length > 0 ? `(${selectedHallIds.length} selected)` : "(all)"}
              </label>
              <input
                type="text"
                placeholder="Type hall code or name to filter…"
                value={hallSearch}
                onChange={(e) => setHallSearch(e.target.value)}
                className={`${multiSelectCls} mb-2`}
              />
              <div className="flex flex-wrap gap-2">
                {filteredHalls.map((dh) => (
                  <button
                    key={dh.id}
                    type="button"
                    onClick={() => {
                      setSelectedHallIds((ids) => toggleId(ids, dh.id))
                      setSelectedRowIds([])
                      setSelectedRackIds([])
                      setRowSearch("")
                      setRackSearch("")
                    }}
                    className={`px-2 py-1 text-xs rounded-md border ${
                      selectedHallIds.includes(dh.id)
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {dh.code} — {dh.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(scope === "row" || scope === "rack") && availableRows.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Row {selectedRowIds.length > 0 ? `(${selectedRowIds.length} selected)` : "(all)"}
              </label>
              <input
                type="text"
                placeholder="Type row name to filter…"
                value={rowSearch}
                onChange={(e) => setRowSearch(e.target.value)}
                className={`${multiSelectCls} mb-2`}
              />
              <div className="flex flex-wrap gap-2">
                {filteredRows.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => {
                      setSelectedRowIds((ids) => toggleId(ids, row.id))
                      setSelectedRackIds([])
                      setRackSearch("")
                    }}
                    className={`px-2 py-1 text-xs rounded-md border ${
                      selectedRowIds.includes(row.id)
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {row.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {scope === "rack" && availableRacks.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Rack {selectedRackIds.length > 0 ? `(${selectedRackIds.length} selected)` : "(all)"}
              </label>
              <input
                type="text"
                placeholder="Type rack name to filter…"
                value={rackSearch}
                onChange={(e) => setRackSearch(e.target.value)}
                className={`${multiSelectCls} mb-2`}
              />
              <div className="flex flex-wrap gap-2">
                {filteredRacks.map((rack) => (
                  <button
                    key={rack.id}
                    type="button"
                    onClick={() => setSelectedRackIds((ids) => toggleId(ids, rack.id))}
                    className={`px-2 py-1 text-xs rounded-md border ${
                      selectedRackIds.includes(rack.id)
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {rack.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={run}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Running..." : "Run Report"}
        </button>
      </div>

      {transactions.length > 0 && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {total} transaction{total !== 1 ? "s" : ""} matched
        </div>
      )}

      {scope === "hall" && Object.keys(byHall).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">By Data Hall</h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {Object.values(byHall)
              .sort((a, b) => b.qty - a.qty)
              .map((hall) => (
                <div key={hall.code} className="px-6 py-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {hall.code} — {hall.name}
                    </span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{hall.qty} total</span>
                  </div>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {Object.values(hall.items)
                        .sort((a, b) => b.qty - a.qty)
                        .map((item) => (
                          <tr key={item.sku}>
                            <td className="py-1 text-gray-500 dark:text-gray-400 pr-4">{item.sku}</td>
                            <td className="py-1 text-gray-700 dark:text-gray-300">{item.name}</td>
                            <td className="py-1 text-right text-gray-900 dark:text-gray-100">{item.qty} {item.unit}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ))}
          </div>
        </div>
      )}

      {scope === "row" && Object.keys(byRow).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">By Row</h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {Object.values(byRow)
              .sort((a, b) => b.qty - a.qty)
              .map((row) => (
                <div key={row.name} className="px-6 py-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{row.name}</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{row.qty} total</span>
                  </div>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {Object.values(row.items)
                        .sort((a, b) => b.qty - a.qty)
                        .map((item) => (
                          <tr key={item.sku}>
                            <td className="py-1 text-gray-500 dark:text-gray-400 pr-4">{item.sku}</td>
                            <td className="py-1 text-gray-700 dark:text-gray-300">{item.name}</td>
                            <td className="py-1 text-right text-gray-900 dark:text-gray-100">{item.qty} {item.unit}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ))}
          </div>
        </div>
      )}

      {scope === "rack" && Object.keys(byRack).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">By Rack</h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {Object.values(byRack)
              .sort((a, b) => b.qty - a.qty)
              .map((rack) => (
                <div key={rack.name} className="px-6 py-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {rack.rowName ? `${rack.rowName} / ` : ""}{rack.name}
                    </span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{rack.qty} total</span>
                  </div>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {Object.values(rack.items)
                        .sort((a, b) => b.qty - a.qty)
                        .map((item) => (
                          <tr key={item.sku}>
                            <td className="py-1 text-gray-500 dark:text-gray-400 pr-4">{item.sku}</td>
                            <td className="py-1 text-gray-700 dark:text-gray-300">{item.name}</td>
                            <td className="py-1 text-right text-gray-900 dark:text-gray-100">{item.qty} {item.unit}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ))}
          </div>
        </div>
      )}

      {scope === "" && Object.keys(byItem).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">By Item</h2>
          </div>
          <table className="min-w-full text-sm divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-gray-500 dark:text-gray-400 uppercase">SKU</th>
                <th className="px-4 py-2 text-left text-xs text-gray-500 dark:text-gray-400 uppercase">Name</th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 dark:text-gray-400 uppercase">Total Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {Object.values(byItem)
                .sort((a, b) => b.qty - a.qty)
                .map((item) => (
                  <tr key={item.sku}>
                    <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{item.sku}</td>
                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{item.name}</td>
                    <td className="px-4 py-2 text-right font-bold text-gray-900 dark:text-gray-100">
                      {item.qty} {item.unit}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {scope === "" && Object.keys(byPerson).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">By Person (Picker)</h2>
          </div>
          <table className="min-w-full text-sm divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-gray-500 dark:text-gray-400 uppercase">Person</th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 dark:text-gray-400 uppercase">Total Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {Object.values(byPerson)
                .sort((a, b) => b.qty - a.qty)
                .map((p) => (
                  <tr key={p.name}>
                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{p.name}</td>
                    <td className="px-4 py-2 text-right font-bold text-gray-900 dark:text-gray-100">{p.qty}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {scope === "" && Object.keys(byDestination).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">By Destination</h2>
          </div>
          <table className="min-w-full text-sm divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-gray-500 dark:text-gray-400 uppercase">
                  Hall / Row / Rack
                </th>
                <th className="px-4 py-2 text-right text-xs text-gray-500 dark:text-gray-400 uppercase">Total Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {Object.values(byDestination)
                .sort((a, b) => b.qty - a.qty)
                .map((d) => (
                  <tr key={d.label}>
                    <td className="px-4 py-2 font-mono text-gray-700 dark:text-gray-300">{d.label}</td>
                    <td className="px-4 py-2 text-right font-bold text-gray-900 dark:text-gray-100">{d.qty}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
