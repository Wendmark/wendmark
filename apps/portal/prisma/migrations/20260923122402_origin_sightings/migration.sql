-- CreateTable
CREATE TABLE "origin_sighting" (
    "id" UUID NOT NULL,
    "appId" UUID NOT NULL,
    "origin" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "origin_sighting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "origin_sighting_appId_origin_key" ON "origin_sighting"("appId", "origin");

-- AddForeignKey
ALTER TABLE "origin_sighting" ADD CONSTRAINT "origin_sighting_appId_fkey" FOREIGN KEY ("appId") REFERENCES "app"("id") ON DELETE CASCADE ON UPDATE CASCADE;
