-- AlterTable
ALTER TABLE "CodeSnapshot" ADD COLUMN     "questionId" TEXT;

-- CreateIndex
CREATE INDEX "CodeSnapshot_roomId_questionId_language_idx" ON "CodeSnapshot"("roomId", "questionId", "language");
