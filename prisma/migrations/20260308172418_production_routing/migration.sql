-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "productionTypeSnapshot" TEXT;

-- AlterTable
ALTER TABLE "ProductConfig" ADD COLUMN     "productionType" TEXT;

-- AlterTable
ALTER TABLE "ProductionJob" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "machineType" TEXT;
