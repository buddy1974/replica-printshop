-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "placement" TEXT;

-- AlterTable
ALTER TABLE "ProductConfig" ADD COLUMN     "placementMode" TEXT,
ADD COLUMN     "printAreaHeightCm" DECIMAL(8,2),
ADD COLUMN     "printAreaWidthCm" DECIMAL(8,2);
