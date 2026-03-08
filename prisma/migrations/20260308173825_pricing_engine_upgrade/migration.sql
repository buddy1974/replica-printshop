-- AlterTable
ALTER TABLE "PricingTable" ADD COLUMN     "pricePerMeter" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "ProductCategory" ADD COLUMN     "defaultPriceMode" TEXT;

-- AlterTable
ALTER TABLE "ProductConfig" ADD COLUMN     "setupPrice" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "ProductOptionValue" ADD COLUMN     "multiplier" DECIMAL(6,4);
