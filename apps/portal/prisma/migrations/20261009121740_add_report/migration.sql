-- CreateTable
CREATE TABLE "report" (
    "id" UUID NOT NULL,
    "appId" UUID NOT NULL,
    "note" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "pages" TEXT[],
    "labels" TEXT NOT NULL,
    "reportVersion" INTEGER NOT NULL DEFAULT 1,
    "userAgent" TEXT,
    "snippetVersion" TEXT,
    "userRef" TEXT,
    "origin" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_appId_createdAt_idx" ON "report"("appId", "createdAt");

-- CreateIndex
CREATE INDEX "report_appId_userRef_idx" ON "report"("appId", "userRef");

-- CreateIndex
CREATE INDEX "report_expiresAt_idx" ON "report"("expiresAt");

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_appId_fkey" FOREIGN KEY ("appId") REFERENCES "app"("id") ON DELETE CASCADE ON UPDATE CASCADE;
