-- DropIndex
DROP INDEX "Shelf_warehouseRowId_code_key";
DROP INDEX "WarehouseRow_warehouseId_code_key";

-- AlterTable
ALTER TABLE "Shelf" DROP COLUMN "code";
ALTER TABLE "WarehouseRow" DROP COLUMN "code";

-- CreateIndex
CREATE UNIQUE INDEX "Shelf_warehouseRowId_name_key" ON "Shelf"("warehouseRowId", "name");
CREATE UNIQUE INDEX "WarehouseRow_warehouseId_name_key" ON "WarehouseRow"("warehouseId", "name");
