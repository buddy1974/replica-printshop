-- Add optional passwordHash column for accounts that use email+password login
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
