/**
 * Pure business logic for stock management.
 * These functions have no side effects and can be tested without a database.
 */

export interface GroupedTransactionResult {
  type: string
  _sum: { quantity: number | null }
}

/**
 * Compute current balance for a stock item from grouped transaction results.
 * Balance = SUM(RECEIVE) - SUM(HANDOUT)
 */
export function computeBalance(grouped: GroupedTransactionResult[]): number {
  let received = 0
  let handedOut = 0
  for (const r of grouped) {
    if (r.type === "RECEIVE") received = r._sum.quantity ?? 0
    if (r.type === "HANDOUT") handedOut = r._sum.quantity ?? 0
  }
  return received - handedOut
}

export interface TransactionInput {
  type?: unknown
  stockItemId?: unknown
  quantity?: unknown
  pickedBy?: unknown
  dataHallId?: unknown
  rowId?: unknown
  rackId?: unknown
  notes?: unknown
  reference?: unknown
}

export type ValidationResult = { valid: true } | { valid: false; error: string }

/**
 * Validate a transaction input before persisting.
 * Returns { valid: true } or { valid: false, error: string }.
 */
export function validateTransactionInput(
  body: TransactionInput,
  currentBalance?: number
): ValidationResult {
  const { type, stockItemId, quantity } = body

  if (!type || !stockItemId || quantity === undefined || quantity === null) {
    return { valid: false, error: "type, stockItemId, quantity are required" }
  }

  const qty = Number(quantity)
  if (isNaN(qty) || qty <= 0) {
    return { valid: false, error: "quantity must be positive" }
  }

  if (type !== "RECEIVE" && type !== "HANDOUT") {
    return { valid: false, error: "type must be RECEIVE or HANDOUT" }
  }

  if (type === "HANDOUT") {
    const { pickedBy, dataHallId, rowId, rackId } = body
    if (!pickedBy || !dataHallId || !rowId || !rackId) {
      return { valid: false, error: "HANDOUT requires pickedBy, dataHallId, rowId, rackId" }
    }
    if (currentBalance !== undefined && qty > currentBalance) {
      return { valid: false, error: `Insufficient stock. Available: ${currentBalance}` }
    }
  }

  return { valid: true }
}
