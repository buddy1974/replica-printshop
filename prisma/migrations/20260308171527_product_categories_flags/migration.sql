-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "categoryName" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "categoryId" TEXT;

-- AlterTable
ALTER TABLE "ProductConfig" ADD COLUMN     "isCut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isDTF" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPrintCut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRoll" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isTextile" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "needsPlacement" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_slug_key" ON "ProductCategory"("slug");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
