-- AlterTable
ALTER TABLE "ProductConfig" ADD COLUMN     "cutOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dtfMaxWidthCm" DECIMAL(8,2),
ADD COLUMN     "maxHeightCm" DECIMAL(8,2),
ADD COLUMN     "maxWidthCm" DECIMAL(8,2),
ADD COLUMN     "needsUpload" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "priceMode" TEXT,
ADD COLUMN     "printAndCut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rollWidthCm" DECIMAL(8,2);
