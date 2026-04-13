import { describe, it, expect } from "vitest"
import { computeBalance, validateTransactionInput } from "@/lib/stock"

describe("computeBalance", () => {
  it("returns 0 when no transactions", () => {
    expect(computeBalance([])).toBe(0)
  })

  it("returns received quantity when only receives", () => {
    expect(
      computeBalance([{ type: "RECEIVE", _sum: { quantity: 50 } }])
    ).toBe(50)
  })

  it("subtracts handouts from receives", () => {
    expect(
      computeBalance([
        { type: "RECEIVE", _sum: { quantity: 100 } },
        { type: "HANDOUT", _sum: { quantity: 30 } },
      ])
    ).toBe(70)
  })

  it("returns negative balance when handouts exceed receives", () => {
    expect(
      computeBalance([
        { type: "RECEIVE", _sum: { quantity: 10 } },
        { type: "HANDOUT", _sum: { quantity: 25 } },
      ])
    ).toBe(-15)
  })

  it("handles null quantity as zero", () => {
    expect(
      computeBalance([
        { type: "RECEIVE", _sum: { quantity: null } },
        { type: "HANDOUT", _sum: { quantity: null } },
      ])
    ).toBe(0)
  })

  it("handles only handouts (no receives)", () => {
    expect(
      computeBalance([{ type: "HANDOUT", _sum: { quantity: 5 } }])
    ).toBe(-5)
  })
})

describe("validateTransactionInput — common rules", () => {
  it("rejects missing type", () => {
    const result = validateTransactionInput({ stockItemId: "item1", quantity: 10 })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain("required")
  })

  it("rejects missing stockItemId", () => {
    const result = validateTransactionInput({ type: "RECEIVE", quantity: 10 })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain("required")
  })

  it("rejects missing quantity", () => {
    const result = validateTransactionInput({ type: "RECEIVE", stockItemId: "item1" })
    expect(result.valid).toBe(false)
  })

  it("rejects zero quantity", () => {
    const result = validateTransactionInput({ type: "RECEIVE", stockItemId: "item1", quantity: 0 })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain("positive")
  })

  it("rejects negative quantity", () => {
    const result = validateTransactionInput({
      type: "RECEIVE",
      stockItemId: "item1",
      quantity: -5,
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain("positive")
  })

  it("rejects unknown type", () => {
    const result = validateTransactionInput({
      type: "TRANSFER",
      stockItemId: "item1",
      quantity: 10,
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain("RECEIVE or HANDOUT")
  })
})

describe("validateTransactionInput — RECEIVE", () => {
  it("accepts valid receive input", () => {
    const result = validateTransactionInput({
      type: "RECEIVE",
      stockItemId: "item1",
      quantity: 10,
    })
    expect(result.valid).toBe(true)
  })

  it("does not require destination fields for receive", () => {
    const result = validateTransactionInput({
      type: "RECEIVE",
      stockItemId: "item1",
      quantity: 5,
    })
    expect(result.valid).toBe(true)
  })
})

describe("validateTransactionInput — HANDOUT", () => {
  const validHandout = {
    type: "HANDOUT",
    stockItemId: "item1",
    quantity: 5,
    pickedBy: "Alice",
    dataHallId: "dh1",
    rowId: "row1",
    rackId: "rack1",
  }

  it("accepts valid handout input", () => {
    const result = validateTransactionInput(validHandout, 100)
    expect(result.valid).toBe(true)
  })

  it("rejects handout missing pickedBy", () => {
    const result = validateTransactionInput({ ...validHandout, pickedBy: undefined }, 100)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain("pickedBy")
  })

  it("rejects handout missing dataHallId", () => {
    const result = validateTransactionInput({ ...validHandout, dataHallId: undefined }, 100)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain("dataHallId")
  })

  it("rejects handout missing rowId", () => {
    const result = validateTransactionInput({ ...validHandout, rowId: undefined }, 100)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain("rowId")
  })

  it("rejects handout missing rackId", () => {
    const result = validateTransactionInput({ ...validHandout, rackId: undefined }, 100)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain("rackId")
  })

  it("rejects handout when quantity exceeds balance", () => {
    const result = validateTransactionInput({ ...validHandout, quantity: 50 }, 30)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toContain("Insufficient stock")
      expect(result.error).toContain("30")
    }
  })

  it("accepts handout when quantity equals balance exactly", () => {
    const result = validateTransactionInput({ ...validHandout, quantity: 30 }, 30)
    expect(result.valid).toBe(true)
  })

  it("accepts handout when quantity is less than balance", () => {
    const result = validateTransactionInput({ ...validHandout, quantity: 1 }, 30)
    expect(result.valid).toBe(true)
  })

  it("skips balance check when currentBalance not provided", () => {
    const result = validateTransactionInput({ ...validHandout, quantity: 9999 })
    expect(result.valid).toBe(true)
  })
})
