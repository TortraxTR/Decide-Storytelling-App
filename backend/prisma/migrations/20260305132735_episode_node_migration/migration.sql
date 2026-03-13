/*
  Warnings:

  - A unique constraint covering the columns `[id,episodeId]` on the table `EpisodeNode` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `episodeId` to the `Decision` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Decision" DROP CONSTRAINT "Decision_sourceNodeId_fkey";

-- DropForeignKey
ALTER TABLE "Decision" DROP CONSTRAINT "Decision_targetNodeId_fkey";

-- AlterTable
ALTER TABLE "Decision" ADD COLUMN     "episodeId" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "Decision_episodeId_idx" ON "Decision"("episodeId");

-- CreateIndex
CREATE UNIQUE INDEX "EpisodeNode_id_episodeId_key" ON "EpisodeNode"("id", "episodeId");

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_sourceNodeId_episodeId_fkey" FOREIGN KEY ("sourceNodeId", "episodeId") REFERENCES "EpisodeNode"("id", "episodeId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_targetNodeId_episodeId_fkey" FOREIGN KEY ("targetNodeId", "episodeId") REFERENCES "EpisodeNode"("id", "episodeId") ON DELETE CASCADE ON UPDATE CASCADE;
