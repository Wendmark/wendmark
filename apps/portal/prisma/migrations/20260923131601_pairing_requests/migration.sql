-- CreateTable
CREATE TABLE "pairing_request" (
    "id" UUID NOT NULL,
    "codeHash" TEXT NOT NULL,
    "appId" UUID NOT NULL,
    "origin" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "sessionToken" TEXT,
    "approvedById" UUID,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pairing_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pairing_request_codeHash_key" ON "pairing_request"("codeHash");

-- CreateIndex
CREATE INDEX "pairing_request_appId_approved_idx" ON "pairing_request"("appId", "approved");

-- AddForeignKey
ALTER TABLE "pairing_request" ADD CONSTRAINT "pairing_request_appId_fkey" FOREIGN KEY ("appId") REFERENCES "app"("id") ON DELETE CASCADE ON UPDATE CASCADE;
