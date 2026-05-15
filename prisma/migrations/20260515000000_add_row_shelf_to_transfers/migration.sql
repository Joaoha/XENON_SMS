-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "sourceWarehouseRowId" TEXT,
ADD COLUMN     "sourceShelfId" TEXT,
ADD COLUMN     "destinationWarehouseRowId" TEXT,
ADD COLUMN     "destinationShelfId" TEXT;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_sourceWarehouseRowId_fkey" FOREIGN KEY ("sourceWarehouseRowId") REFERENCES "WarehouseRow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_sourceShelfId_fkey" FOREIGN KEY ("sourceShelfId") REFERENCES "Shelf"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_destinationWarehouseRowId_fkey" FOREIGN KEY ("destinationWarehouseRowId") REFERENCES "WarehouseRow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_destinationShelfId_fkey" FOREIGN KEY ("destinationShelfId") REFERENCES "Shelf"("id") ON DELETE SET NULL ON UPDATE CASCADE;
