-- CreateTable: PendingUpload (pre-checkout file, linked to CartItem)
CREATE TABLE "PendingUpload" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "filename" TEXT NOT NULL,
    "filePath" TEXT,
    "size" INTEGER,
    "mime" TEXT,
    "dpi" INTEGER,
    "widthPx" INTEGER,
    "heightPx" INTEGER,
    "validStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PendingUpload_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add pendingUploadId to CartItem
ALTER TABLE "CartItem" ADD COLUMN "pendingUploadId" TEXT;

-- UniqueIndex on CartItem.pendingUploadId (one-to-one)
CREATE UNIQUE INDEX "CartItem_pendingUploadId_key" ON "CartItem"("pendingUploadId");

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_pendingUploadId_fkey"
    FOREIGN KEY ("pendingUploadId") REFERENCES "PendingUpload"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "PendingUpload_userId_idx" ON "PendingUpload"("userId");
CREATE INDEX "PendingUpload_createdAt_idx" ON "PendingUpload"("createdAt");
