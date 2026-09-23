-- CreateTable
CREATE TABLE "author_token" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "appId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "origin" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "author_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "author_token_tokenHash_key" ON "author_token"("tokenHash");

-- CreateIndex
CREATE INDEX "author_token_appId_idx" ON "author_token"("appId");

-- AddForeignKey
ALTER TABLE "author_token" ADD CONSTRAINT "author_token_appId_fkey" FOREIGN KEY ("appId") REFERENCES "app"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "author_token" ADD CONSTRAINT "author_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
