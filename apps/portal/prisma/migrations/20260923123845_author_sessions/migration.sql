-- CreateTable
CREATE TABLE "author_session" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "appId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "origin" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "author_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "author_session_tokenHash_key" ON "author_session"("tokenHash");

-- CreateIndex
CREATE INDEX "author_session_appId_idx" ON "author_session"("appId");

-- AddForeignKey
ALTER TABLE "author_session" ADD CONSTRAINT "author_session_appId_fkey" FOREIGN KEY ("appId") REFERENCES "app"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "author_session" ADD CONSTRAINT "author_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
