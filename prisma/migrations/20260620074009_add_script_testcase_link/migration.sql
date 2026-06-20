-- AlterTable
ALTER TABLE "test_scripts" ADD COLUMN     "testCaseId" TEXT;

-- CreateIndex
CREATE INDEX "test_scripts_testCaseId_idx" ON "test_scripts"("testCaseId");

-- AddForeignKey
ALTER TABLE "test_scripts" ADD CONSTRAINT "test_scripts_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "test_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
