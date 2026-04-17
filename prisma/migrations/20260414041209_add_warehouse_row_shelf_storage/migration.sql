/*
  Warnings:

  - You are about to drop the column `storageDataHallId` on the `StockItem` table. All the data in the column will be lost.
  - You are about to drop the column `storageRackId` on the `StockItem` table. All the data in the column will be lost.
  - You are about to drop the column `storageRowId` on the `StockItem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "StockItem" DROP CONSTRAINT "StockItem_storageDataHallId_fkey";

-- DropForeignKey
ALTER TABLE "StockItem" DROP CONSTRAINT "StockItem_storageRackId_fkey";

-- DropForeignKey
ALTER TABLE "StockItem" DROP CONSTRAINT "StockItem_storageRowId_fkey";

-- AlterTable
ALTER TABLE "StockItem" DROP COLUMN "storageDataHallId",
DROP COLUMN "storageRackId",
DROP COLUMN "storageRowId",
ADD COLUMN     "shelfId" TEXT,
ADD COLUMN     "warehouseId" TEXT,
ADD COLUMN     "warehouseRowId" TEXT;

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseRow" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WarehouseRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shelf" (
    "id" TEXT NOT NULL,
    "warehouseRowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shelf_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_code_key" ON "Warehouse"("code");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseRow_warehouseId_code_key" ON "WarehouseRow"("warehouseId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Shelf_warehouseRowId_code_key" ON "Shelf"("warehouseRowId", "code");

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_warehouseRowId_fkey" FOREIGN KEY ("warehouseRowId") REFERENCES "WarehouseRow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_shelfId_fkey" FOREIGN KEY ("shelfId") REFERENCES "Shelf"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseRow" ADD CONSTRAINT "WarehouseRow_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shelf" ADD CONSTRAINT "Shelf_warehouseRowId_fkey" FOREIGN KEY ("warehouseRowId") REFERENCES "WarehouseRow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
