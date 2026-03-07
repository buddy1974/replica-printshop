-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "express" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "expressMultiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.5,
ADD COLUMN     "shippingPrice" DECIMAL(10,2) NOT NULL DEFAULT 0;
