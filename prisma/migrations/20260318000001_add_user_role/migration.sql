-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'ADMIN', 'SUPERADMIN');

-- AlterTable: add role column, migrate existing isAdmin data, drop old column
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER';
UPDATE "User" SET "role" = 'ADMIN' WHERE "isAdmin" = true;
ALTER TABLE "User" DROP COLUMN "isAdmin";
