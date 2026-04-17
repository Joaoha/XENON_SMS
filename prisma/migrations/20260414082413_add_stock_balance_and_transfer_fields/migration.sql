-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'TRANSFER';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "destinationWarehouseId" TEXT,
ADD COLUMN     "sourceWarehouseId" TEXT;

-- CreateTable
CREATE TABLE "StockBalance" (
    "id" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockBalance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockBalance_stockItemId_warehouseId_key" ON "StockBalance"("stockItemId", "warehouseId");

-- AddForeignKey
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_sourceWarehouseId_fkey" FOREIGN KEY ("sourceWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_destinationWarehouseId_fkey" FOREIGN KEY ("destinationWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: populate StockBalance from existing transactions for items with a warehouse
INSERT INTO "StockBalance" ("id", "stockItemId", "warehouseId", "quantity", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  si."id",
  si."warehouseId",
  COALESCE(
    (SELECT SUM(CASE WHEN t."type" = 'RECEIVE' THEN t."quantity" ELSE -t."quantity" END)
     FROM "Transaction" t
     WHERE t."stockItemId" = si."id" AND t."deletedAt" IS NULL),
    0
  ),
  NOW(),
  NOW()
FROM "StockItem" si
WHERE si."warehouseId" IS NOT NULL
ON CONFLICT ("stockItemId", "warehouseId") DO NOTHING;

-- Backfill: set destinationWarehouseId on historical RECEIVE transactions
UPDATE "Transaction" t
SET "destinationWarehouseId" = si."warehouseId"
FROM "StockItem" si
WHERE t."stockItemId" = si."id"
  AND t."type" = 'RECEIVE'
  AND si."warehouseId" IS NOT NULL
  AND t."destinationWarehouseId" IS NULL;

-- Backfill: set sourceWarehouseId on historical HANDOUT transactions
UPDATE "Transaction" t
SET "sourceWarehouseId" = si."warehouseId"
FROM "StockItem" si
WHERE t."stockItemId" = si."id"
  AND t."type" = 'HANDOUT'
  AND si."warehouseId" IS NOT NULL
  AND t."sourceWarehouseId" IS NULL;
