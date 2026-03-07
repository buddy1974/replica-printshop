-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "previewUrl" TEXT;

-- CreateTable
CREATE TABLE "MockupTemplate" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "printAreaX" DOUBLE PRECISION,
    "printAreaY" DOUBLE PRECISION,
    "printAreaWidth" DOUBLE PRECISION,
    "printAreaHeight" DOUBLE PRECISION,

    CONSTRAINT "MockupTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MockupTemplate_productId_idx" ON "MockupTemplate"("productId");

-- AddForeignKey
ALTER TABLE "MockupTemplate" ADD CONSTRAINT "MockupTemplate_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
