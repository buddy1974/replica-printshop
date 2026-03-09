-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "description" TEXT,
ADD COLUMN     "shortDescription" TEXT;

-- AlterTable
ALTER TABLE "ProductCategory" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "ProductConfig" ADD COLUMN     "helpText" TEXT,
ADD COLUMN     "uploadInstructions" TEXT;
