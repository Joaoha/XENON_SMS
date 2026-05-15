import { describe, it, expect } from "vitest"
import { parseCsv, CSV_TEMPLATE_HEADER } from "@/lib/csv-import"

describe("parseCsv", () => {
  it("returns error for empty input", () => {
    const result = parseCsv("")
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain("empty")
  })

  it("returns error for missing required columns", () => {
    const result = parseCsv("foo,bar\na,b")
    expect(result.errors.length).toBeGreaterThanOrEqual(1)
    expect(result.errors.some((e) => e.message.includes("data_hall_code"))).toBe(true)
  })

  it("parses valid CSV rows", () => {
    const csv = `${CSV_TEMPLATE_HEADER}
DH1,Data Hall 1,Row A,Rack 01
DH1,Data Hall 1,Row A,Rack 02
DH2,Data Hall 2,Row B,Rack 01`
    const result = parseCsv(csv)
    expect(result.errors).toHaveLength(0)
    expect(result.rows).toHaveLength(3)
    expect(result.rows[0].dataHallCode).toBe("DH1")
    expect(result.rows[0].dataHallName).toBe("Data Hall 1")
    expect(result.rows[0].rowName).toBe("Row A")
    expect(result.rows[0].rackName).toBe("Rack 01")
    expect(result.rows[0].rowNumber).toBe(2)
  })

  it("uppercases data_hall_code", () => {
    const csv = `${CSV_TEMPLATE_HEADER}
dh1,Data Hall 1,Row A,Rack 01`
    const result = parseCsv(csv)
    expect(result.rows[0].dataHallCode).toBe("DH1")
  })

  it("reports missing fields per row", () => {
    const csv = `${CSV_TEMPLATE_HEADER}
DH1,,Row A,Rack 01
,Data Hall 1,,Rack 02`
    const result = parseCsv(csv)
    expect(result.errors.some((e) => e.row === 2 && e.message.includes("data_hall_name"))).toBe(true)
    expect(result.errors.some((e) => e.row === 3 && e.message.includes("data_hall_code"))).toBe(true)
    expect(result.errors.some((e) => e.row === 3 && e.message.includes("row_name"))).toBe(true)
  })

  it("detects duplicate rows within file", () => {
    const csv = `${CSV_TEMPLATE_HEADER}
DH1,Data Hall 1,Row A,Rack 01
DH1,Data Hall 1,Row A,Rack 01`
    const result = parseCsv(csv)
    expect(result.errors.some((e) => e.message.includes("Duplicate"))).toBe(true)
  })

  it("handles Windows-style line endings", () => {
    const csv = `${CSV_TEMPLATE_HEADER}\r\nDH1,Data Hall 1,Row A,Rack 01\r\n`
    const result = parseCsv(csv)
    expect(result.errors).toHaveLength(0)
    expect(result.rows).toHaveLength(1)
  })

  it("ignores blank lines", () => {
    const csv = `${CSV_TEMPLATE_HEADER}

DH1,Data Hall 1,Row A,Rack 01

`
    const result = parseCsv(csv)
    expect(result.errors).toHaveLength(0)
    expect(result.rows).toHaveLength(1)
  })
})
