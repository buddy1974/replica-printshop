-- AlterTable PendingUpload: add Vercel Blob URL column
ALTER TABLE "PendingUpload" ADD COLUMN "blobUrl" TEXT;
