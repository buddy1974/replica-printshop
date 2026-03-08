-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippingMethodId" TEXT;

-- AlterTable
ALTER TABLE "ProductCategory" ADD COLUMN     "allowPickup" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowShipping" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ProductConfig" ADD COLUMN     "shippingRequired" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ShippingMethod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ShippingMethod_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shippingMethodId_fkey" FOREIGN KEY ("shippingMethodId") REFERENCES "ShippingMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
