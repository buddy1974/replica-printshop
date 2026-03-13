-- AlterTable: extend ShippingRule with size, country, and method fields
ALTER TABLE "ShippingRule" ADD COLUMN "method"  TEXT;
ALTER TABLE "ShippingRule" ADD COLUMN "country" TEXT;
ALTER TABLE "ShippingRule" ADD COLUMN "minSize" DOUBLE PRECISION;
ALTER TABLE "ShippingRule" ADD COLUMN "maxSize" DOUBLE PRECISION;
ALTER TABLE "ShippingRule" ADD COLUMN "minQty"  INTEGER;
ALTER TABLE "ShippingRule" ADD COLUMN "maxQty"  INTEGER;
