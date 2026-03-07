-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "allowedFormats" TEXT,
ADD COLUMN     "bleedMm" DOUBLE PRECISION,
ADD COLUMN     "guideText" TEXT,
ADD COLUMN     "minDpi" INTEGER,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "recommendedDpi" INTEGER,
ADD COLUMN     "safeMarginMm" DOUBLE PRECISION;
