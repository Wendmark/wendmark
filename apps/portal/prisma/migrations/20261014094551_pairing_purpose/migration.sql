-- AlterTable
ALTER TABLE "author_session" ADD COLUMN     "purpose" TEXT NOT NULL DEFAULT 'record',
ADD COLUMN     "reportId" UUID;

-- AlterTable
ALTER TABLE "pairing_request" ADD COLUMN     "purpose" TEXT NOT NULL DEFAULT 'record';
