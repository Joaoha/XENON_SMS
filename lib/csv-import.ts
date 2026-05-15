export interface CsvRow {
  rowNumber: number
  dataHallCode: string
  dataHallName: string
  rowName: string
  rackName: string
}

export interface ValidationError {
  row: number
  message: string
}

export interface ParseResult {
  rows: CsvRow[]
  errors: ValidationError[]
}

const REQUIRED_HEADERS = ["data_hall_code", "data_hall_name", "row_name", "rack_name"]

export const CSV_TEMPLATE_HEADER = "data_hall_code,data_hall_name,row_name,rack_name"
export const CSV_TEMPLATE_EXAMPLE = `${CSV_TEMPLATE_HEADER}
DH1,Data Hall 1,Row A,Rack 01
DH1,Data Hall 1,Row A,Rack 02
DH1,Data Hall 1,Row B,Rack 01
DH2,Data Hall 2,Row A,Rack 01`

export function parseCsv(text: string): ParseResult {
  const rows: CsvRow[] = []
  const errors: ValidationError[] = []

  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim() !== "")

  if (lines.length === 0) {
    errors.push({ row: 0, message: "File is empty" })
    return { rows, errors }
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())
  for (const req of REQUIRED_HEADERS) {
    if (!headers.includes(req)) {
      errors.push({ row: 1, message: `Missing required column: ${req}` })
    }
  }
  if (errors.length > 0) return { rows, errors }

  const colIdx = {
    dataHallCode: headers.indexOf("data_hall_code"),
    dataHallName: headers.indexOf("data_hall_name"),
    rowName: headers.indexOf("row_name"),
    rackName: headers.indexOf("rack_name"),
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim())
    const rowNum = i + 1

    const dataHallCode = cols[colIdx.dataHallCode] || ""
    const dataHallName = cols[colIdx.dataHallName] || ""
    const rowName = cols[colIdx.rowName] || ""
    const rackName = cols[colIdx.rackName] || ""

    if (!dataHallCode) errors.push({ row: rowNum, message: "data_hall_code is required" })
    if (!dataHallName) errors.push({ row: rowNum, message: "data_hall_name is required" })
    if (!rowName) errors.push({ row: rowNum, message: "row_name is required" })
    if (!rackName) errors.push({ row: rowNum, message: "rack_name is required" })

    if (dataHallCode && dataHallName && rowName && rackName) {
      rows.push({
        rowNumber: rowNum,
        dataHallCode: dataHallCode.toUpperCase(),
        dataHallName,
        rowName,
        rackName,
      })
    }
  }

  const seen = new Set<string>()
  for (const row of rows) {
    const key = `${row.dataHallCode}|${row.rowName}|${row.rackName}`
    if (seen.has(key)) {
      errors.push({
        row: row.rowNumber,
        message: `Duplicate within file: ${row.dataHallCode} / ${row.rowName} / ${row.rackName}`,
      })
    }
    seen.add(key)
  }

  return { rows, errors }
}

export interface ImportPreviewRow {
  rowNumber: number
  dataHallCode: string
  dataHallName: string
  rowName: string
  rackName: string
  action: "create" | "skip" | "error"
  detail?: string
}

export interface ImportPreview {
  rows: ImportPreviewRow[]
  errors: ValidationError[]
  summary: { toCreate: number; toSkip: number; errors: number }
}
