-- AlterTable PendingUpload: add pathname column for Vercel Blob
ALTER TABLE "PendingUpload" ADD COLUMN "pathname" TEXT;
