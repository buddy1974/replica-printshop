-- CreateTable
CREATE TABLE "ChatLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "hasFile" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatLog_sessionId_idx" ON "ChatLog"("sessionId");

-- CreateIndex
CREATE INDEX "ChatLog_createdAt_idx" ON "ChatLog"("createdAt");
