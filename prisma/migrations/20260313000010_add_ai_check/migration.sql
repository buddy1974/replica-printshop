-- Add aiCheck (JSON) to Design and PendingUpload for AI print quality analysis
ALTER TABLE "Design"        ADD COLUMN "aiCheck" JSONB;
ALTER TABLE "PendingUpload" ADD COLUMN "aiCheck" JSONB;
