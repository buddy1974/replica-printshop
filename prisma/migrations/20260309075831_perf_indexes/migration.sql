-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "ProductionJob_status_idx" ON "ProductionJob"("status");

-- CreateIndex
CREATE INDEX "ProductionJob_machineType_idx" ON "ProductionJob"("machineType");

-- CreateIndex
CREATE INDEX "UploadFile_status_idx" ON "UploadFile"("status");
