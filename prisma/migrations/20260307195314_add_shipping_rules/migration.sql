-- AlterEnum
ALTER TYPE "DeliveryType" ADD VALUE 'PICKUP';

-- AlterTable
ALTER TABLE "ProductConfig" ADD COLUMN     "pickupAllowed" BOOLEAN;

-- CreateTable
CREATE TABLE "ShippingRule" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "minTotal" DECIMAL(10,2),
    "price" DECIMAL(10,2),
    "multiplier" DECIMAL(4,2),

    CONSTRAINT "ShippingRule_pkey" PRIMARY KEY ("id")
);
