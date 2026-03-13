-- CreateTable: TaxRate
-- DB-configurable VAT rates per country (falls back to hardcoded map in tax.ts)
CREATE TABLE "TaxRate" (
    "id"      TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "rate"    DECIMAL(5,2) NOT NULL,
    "label"   TEXT,
    CONSTRAINT "TaxRate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TaxRate_country_key" ON "TaxRate"("country");
