-- AddForeignKey
ALTER TABLE "flow_version" ADD CONSTRAINT "flow_version_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
