-- CreateTable
CREATE TABLE "ProductConfig" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "hasCustomSize" BOOLEAN NOT NULL DEFAULT false,
    "hasFixedSizes" BOOLEAN NOT NULL DEFAULT false,
    "hasVariants" BOOLEAN NOT NULL DEFAULT false,
    "hasOptions" BOOLEAN NOT NULL DEFAULT false,
    "fixedSizes" TEXT,
    "minWidth" DOUBLE PRECISION,
    "maxWidth" DOUBLE PRECISION,
    "minHeight" DOUBLE PRECISION,
    "maxHeight" DOUBLE PRECISION,
    "printWidth" DOUBLE PRECISION,
    "printHeight" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "ProductConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductConfig_productId_key" ON "ProductConfig"("productId");

-- AddForeignKey
ALTER TABLE "ProductConfig" ADD CONSTRAINT "ProductConfig_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
