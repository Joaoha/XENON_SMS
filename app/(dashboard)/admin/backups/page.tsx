"use client"

import { useState, useEffect } from "react"

interface BackupFile {
  period: string
  filename: string
  csvSize: number
  date: string
  rowCount: number | null
  checksumValid: boolean | null
}

interface RestoreResult {
  success: boolean
  inserted: number
  restored: number
  skipped: number
  errors: string[]
  affectedItems: number
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<BackupFile[]>([])
  const [loading, setLoading] = useState(true)
  const [triggerLoading, setTriggerLoading] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [lastBackupByPeriod, setLastBackupByPeriod] = useState<Record<string, string>>({})
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null)
  const [restoreLoading, setRestoreLoading] = useState(false)

  useEffect(() => {
    loadBackups()
  }, [])

  async function loadBackups() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/backups")
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to load" }))
        setError(err.error || "Failed to load backups")
        return
      }
      const data = await res.json()
      setBackups(data.backups)
      setLastBackupByPeriod(data.lastBackupByPeriod || {})
    } catch {
      setError("Failed to load backups")
    } finally {
      setLoading(false)
    }
  }

  async function triggerBackup(period: string) {
    setTriggerLoading(period)
    setError("")
    setSuccess("")
    try {
      const res = await fetch("/api/admin/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Backup failed" }))
        setError(err.error || "Backup failed")
        return
      }
      const result = await res.json()
      setSuccess(`Backup created: ${result.rowCount} rows (${result.period})`)
      loadBackups()
    } catch {
      setError("Backup request failed")
    } finally {
      setTriggerLoading(null)
    }
  }

  async function handleRestore(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSuccess("")
    setRestoreResult(null)
    setRestoreLoading(true)

    const form = e.currentTarget
    const formData = new FormData(form)
    const csvFile = formData.get("csv") as File | null
    const metaFile = formData.get("meta") as File | null

    if (!csvFile?.size || !metaFile?.size) {
      setError("Both CSV and .meta.json files are required")
      setRestoreLoading(false)
      return
    }

    try {
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        body: formData,
      })
      const result = await res.json()
      if (!res.ok) {
        setError(result.error || "Restore failed")
        setRestoreLoading(false)
        return
      }
      setRestoreResult(result)
      setSuccess("Restore completed successfully")
      form.reset()
    } catch {
      setError("Restore request failed")
    } finally {
      setRestoreLoading(false)
    }
  }

  function downloadUrl(period: string, filename: string, type: "csv" | "meta"): string {
    return `/api/admin/backups/download?period=${encodeURIComponent(period)}&filename=${encodeURIComponent(filename)}&type=${type}`
  }

  const inputCls =
    "mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Backups</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Manage transaction backups — trigger, download, and restore.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/30 p-3 text-sm text-green-700 dark:text-green-400">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(["daily", "weekly", "monthly", "full"] as const).map((period) => (
          <button
            key={period}
            onClick={() => triggerBackup(period)}
            disabled={triggerLoading !== null}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-left hover:ring-2 hover:ring-blue-500 transition disabled:opacity-50"
          >
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">
              {period}
            </div>
            <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
              {triggerLoading === period ? "Running..." : "Run backup now"}
            </div>
            {lastBackupByPeriod[period] && (
              <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                Last: {new Date(lastBackupByPeriod[period]).toLocaleString()}
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Existing Backups
          </h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
          ) : backups.length === 0 ? (
            <p className="p-6 text-sm text-gray-500 dark:text-gray-400">No backup files found.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Period
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    File
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Rows
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Size
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Checksum
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Download
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {backups.map((b) => (
                  <tr key={`${b.period}/${b.filename}`}>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 capitalize">
                      {b.period}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-mono">
                      {b.filename}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(b.date).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {b.rowCount ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {formatBytes(b.csvSize)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {b.checksumValid === true && (
                        <span className="text-green-600 dark:text-green-400">Valid</span>
                      )}
                      {b.checksumValid === false && (
                        <span className="text-red-600 dark:text-red-400">Mismatch</span>
                      )}
                      {b.checksumValid === null && (
                        <span className="text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm space-x-2">
                      <a
                        href={downloadUrl(b.period, b.filename, "csv")}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        CSV
                      </a>
                      <a
                        href={downloadUrl(b.period, b.filename, "meta")}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Meta
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Restore from Backup
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Upload a CSV backup file and its .meta.json sidecar to restore transactions.
        </p>

        <form onSubmit={handleRestore} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              CSV file
            </label>
            <input type="file" name="csv" accept=".csv" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Meta JSON file (.meta.json)
            </label>
            <input type="file" name="meta" accept=".json" className={inputCls} />
          </div>
          <button
            type="submit"
            disabled={restoreLoading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {restoreLoading ? "Restoring..." : "Restore"}
          </button>
        </form>

        {restoreResult && (
          <div className="mt-4 rounded-md bg-gray-50 dark:bg-gray-900 p-4 text-sm space-y-1">
            <div className="text-gray-900 dark:text-gray-100 font-medium">Restore Result</div>
            <div className="text-gray-600 dark:text-gray-400">
              Inserted: {restoreResult.inserted} | Restored: {restoreResult.restored} | Skipped:{" "}
              {restoreResult.skipped} | Affected items: {restoreResult.affectedItems}
            </div>
            {restoreResult.errors.length > 0 && (
              <div className="text-red-600 dark:text-red-400 mt-2">
                <div className="font-medium">Errors ({restoreResult.errors.length}):</div>
                <ul className="list-disc list-inside mt-1">
                  {restoreResult.errors.slice(0, 20).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {restoreResult.errors.length > 20 && (
                    <li>... and {restoreResult.errors.length - 20} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
