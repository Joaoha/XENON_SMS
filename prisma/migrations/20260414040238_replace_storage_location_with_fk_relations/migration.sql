/*
  Warnings:

  - You are about to drop the column `storageLocation` on the `StockItem` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "StockItem" DROP COLUMN "storageLocation",
ADD COLUMN     "storageDataHallId" TEXT,
ADD COLUMN     "storageRackId" TEXT,
ADD COLUMN     "storageRowId" TEXT;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_storageDataHallId_fkey" FOREIGN KEY ("storageDataHallId") REFERENCES "DataHall"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_storageRowId_fkey" FOREIGN KEY ("storageRowId") REFERENCES "Row"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_storageRackId_fkey" FOREIGN KEY ("storageRackId") REFERENCES "Rack"("id") ON DELETE SET NULL ON UPDATE CASCADE;
