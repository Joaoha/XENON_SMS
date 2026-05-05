-- CreateTable
CREATE TABLE "HandoutProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HandoutProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandoutProfileItem" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "HandoutProfileItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HandoutProfile_name_key" ON "HandoutProfile"("name");

-- CreateIndex
CREATE UNIQUE INDEX "HandoutProfileItem_profileId_stockItemId_key" ON "HandoutProfileItem"("profileId", "stockItemId");

-- AddForeignKey
ALTER TABLE "HandoutProfileItem" ADD CONSTRAINT "HandoutProfileItem_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "HandoutProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandoutProfileItem" ADD CONSTRAINT "HandoutProfileItem_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
