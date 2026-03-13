-- AlterTable Design
ALTER TABLE "Design" ADD COLUMN "preflightScore" INTEGER;

-- AlterTable PendingUpload
ALTER TABLE "PendingUpload" ADD COLUMN "preflightScore" INTEGER;

-- AlterTable CartItem
ALTER TABLE "CartItem" ADD COLUMN "preflightScore" INTEGER;

-- AlterTable OrderItem
ALTER TABLE "OrderItem" ADD COLUMN "preflightScore" INTEGER;
