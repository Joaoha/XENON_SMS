export interface GroupedTransactionResult {
  type: string
  _sum: { quantity: number | null }
}

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

export interface TransferItem {
  stockItemId: string
  quantity: number
  sourceWarehouseId: string
  destinationWarehouseId: string
}

export interface TransferInput {
  items?: unknown
  notes?: unknown
  reference?: unknown
}

export function validateTransferInput(body: TransferInput): ValidationResult {
  const { items } = body
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, error: "items array is required and must not be empty" }
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const prefix = items.length > 1 ? `Item ${i + 1}: ` : ""

    if (!item.stockItemId) {
      return { valid: false, error: `${prefix}stockItemId is required` }
    }

    const qty = Number(item.quantity)
    if (isNaN(qty) || qty <= 0) {
      return { valid: false, error: `${prefix}quantity must be positive` }
    }

    if (!item.sourceWarehouseId || !item.destinationWarehouseId) {
      return { valid: false, error: `${prefix}sourceWarehouseId and destinationWarehouseId are required` }
    }

    if (item.sourceWarehouseId === item.destinationWarehouseId) {
      return { valid: false, error: `${prefix}source and destination warehouses must be different` }
    }
  }

  return { valid: true }
}
