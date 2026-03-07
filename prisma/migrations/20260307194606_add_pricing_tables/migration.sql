-- AlterTable
ALTER TABLE "ProductConfig" ADD COLUMN     "pricingType" TEXT;

-- CreateTable
CREATE TABLE "PricingTable" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "minQty" INTEGER,
    "maxQty" INTEGER,
    "minWidth" DOUBLE PRECISION,
    "maxWidth" DOUBLE PRECISION,
    "minHeight" DOUBLE PRECISION,
    "maxHeight" DOUBLE PRECISION,
    "price" DECIMAL(10,2) NOT NULL,
    "pricePerM2" DECIMAL(10,2),

    CONSTRAINT "PricingTable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PricingTable_productId_idx" ON "PricingTable"("productId");

-- AddForeignKey
ALTER TABLE "PricingTable" ADD CONSTRAINT "PricingTable_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
