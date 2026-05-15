"use client"

import { useState, useRef } from "react"

interface PreviewRow {
  rowNumber: number
  dataHallCode: string
  dataHallName: string
  rowName: string
  rackName: string
  action: "create" | "skip" | "error"
  detail?: string
}

interface ValidationError {
  row: number
  message: string
}

interface PreviewResult {
  rows: PreviewRow[]
  errors: ValidationError[]
  summary: { toCreate: number; toSkip: number; errors: number }
}

interface CommitResult {
  created: number
  skipped: number
  failed: number
  errors: string[]
}

type Step = "upload" | "preview" | "result"

export function DestinationImport({ onImported }: { onImported: () => void }) {
  const [step, setStep] = useState<Step>("upload")
  const [csvText, setCsvText] = useState("")
  const [fileName, setFileName] = useState("")
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [result, setResult] = useState<CommitResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setStep("upload")
    setCsvText("")
    setFileName("")
    setPreview(null)
    setResult(null)
    setError("")
    if (fileRef.current) fileRef.current.value = ""
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const text = await file.text()
    setCsvText(text)
    setError("")
  }

  async function validate() {
    if (!csvText) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/destinations/import/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText }),
      })
      const data: PreviewResult = await res.json()
      setPreview(data)
      setStep("preview")
    } catch {
      setError("Failed to validate CSV")
    } finally {
      setLoading(false)
    }
  }

  async function commit() {
    if (!csvText) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/destinations/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText, fileName }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || "Import failed")
        return
      }
      const data: CommitResult = await res.json()
      setResult(data)
      setStep("result")
      onImported()
    } catch {
      setError("Failed to commit import")
    } finally {
      setLoading(false)
    }
  }

  function downloadErrors() {
    if (!result?.errors.length) return
    const blob = new Blob([result.errors.join("\n")], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "import-errors.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  const btnCls = "px-3 py-1.5 text-sm rounded-md disabled:opacity-50"
  const btnPrimary = `${btnCls} bg-blue-600 text-white hover:bg-blue-700`
  const btnSecondary = `${btnCls} bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500`

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200">Bulk CSV Import</h2>
        <a
          href="/api/destinations/import/template"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Download template
        </a>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Upload a CSV with columns: <code>data_hall_code</code>, <code>data_hall_name</code>, <code>row_name</code>, <code>rack_name</code>.
        All hierarchy levels (Data Hall, Row, Rack) are created automatically. Existing entries are skipped (idempotent).
      </p>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-400">{error}</div>
      )}

      {step === "upload" && (
        <div className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
          />
          {fileName && (
            <p className="text-sm text-gray-600 dark:text-gray-300">Selected: {fileName}</p>
          )}
          <button onClick={validate} disabled={!csvText || loading} className={btnPrimary}>
            {loading ? "Validating..." : "Upload & Preview"}
          </button>
        </div>
      )}

      {step === "preview" && preview && (
        <div className="space-y-4">
          <div className="flex gap-4 text-sm">
            <span className="px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
              To create: {preview.summary.toCreate}
            </span>
            <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              To skip: {preview.summary.toSkip}
            </span>
            {preview.summary.errors > 0 && (
              <span className="px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                Errors: {preview.summary.errors}
              </span>
            )}
          </div>

          {preview.errors.length > 0 && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-400 max-h-40 overflow-y-auto">
              <p className="font-medium mb-1">Validation errors (fix and re-upload):</p>
              {preview.errors.map((e, i) => (
                <p key={i}>Row {e.row}: {e.message}</p>
              ))}
            </div>
          )}

          {preview.rows.length > 0 && (
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left text-gray-500 dark:text-gray-400">Row</th>
                    <th className="px-2 py-1 text-left text-gray-500 dark:text-gray-400">Data Hall</th>
                    <th className="px-2 py-1 text-left text-gray-500 dark:text-gray-400">Row Name</th>
                    <th className="px-2 py-1 text-left text-gray-500 dark:text-gray-400">Rack</th>
                    <th className="px-2 py-1 text-left text-gray-500 dark:text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r, i) => (
                    <tr key={i} className={r.action === "skip" ? "text-gray-400 dark:text-gray-500" : "text-gray-700 dark:text-gray-300"}>
                      <td className="px-2 py-1">{r.rowNumber}</td>
                      <td className="px-2 py-1">{r.dataHallCode}</td>
                      <td className="px-2 py-1">{r.rowName}</td>
                      <td className="px-2 py-1">{r.rackName}</td>
                      <td className="px-2 py-1">
                        <span className={
                          r.action === "create"
                            ? "text-green-600 dark:text-green-400"
                            : r.action === "skip"
                              ? "text-gray-400 dark:text-gray-500"
                              : "text-red-600 dark:text-red-400"
                        }>
                          {r.action}{r.detail ? ` — ${r.detail}` : ""}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={reset} className={btnSecondary}>
              Back
            </button>
            <button
              onClick={commit}
              disabled={loading || preview.summary.errors > 0 || preview.summary.toCreate === 0}
              className={btnPrimary}
            >
              {loading ? "Importing..." : `Commit ${preview.summary.toCreate} new entries`}
            </button>
          </div>
        </div>
      )}

      {step === "result" && result && (
        <div className="space-y-3">
          <div className="rounded-md bg-green-50 dark:bg-green-900/30 p-4 text-sm text-green-700 dark:text-green-400">
            <p className="font-medium">Import complete</p>
            <p>Created: {result.created} | Skipped: {result.skipped} | Failed: {result.failed}</p>
          </div>
          {result.errors.length > 0 && (
            <div className="space-y-1">
              <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-400 max-h-32 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <p key={i}>{e}</p>
                ))}
              </div>
              <button onClick={downloadErrors} className={btnSecondary}>
                Download error report
              </button>
            </div>
          )}
          <button onClick={reset} className={btnPrimary}>
            Import another file
          </button>
        </div>
      )}
    </div>
  )
}
