-- Add stripePaymentIntentId to Order for idempotency
ALTER TABLE "Order" ADD COLUMN "stripePaymentIntentId" TEXT;
CREATE UNIQUE INDEX "Order_stripePaymentIntentId_key" ON "Order"("stripePaymentIntentId");

-- Add designId to OrderItem to preserve design link
ALTER TABLE "OrderItem" ADD COLUMN "designId" TEXT;
