-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- DropForeignKey
ALTER TABLE "Decision" DROP CONSTRAINT "Decision_sourceNodeId_episodeId_fkey";

-- DropForeignKey
ALTER TABLE "Decision" DROP CONSTRAINT "Decision_targetNodeId_episodeId_fkey";

-- AlterTable
ALTER TABLE "Episode" DROP COLUMN "description",
DROP COLUMN "thumbnail",
ADD COLUMN     "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "order" DROP DEFAULT;

-- AlterTable
ALTER TABLE "EpisodeNode" DROP COLUMN "contentUrl",
ADD COLUMN     "assetHeight" INTEGER,
ADD COLUMN     "assetKey" VARCHAR(1024) NOT NULL,
ADD COLUMN     "assetWidth" INTEGER;

-- AlterTable
ALTER TABLE "Story" ADD COLUMN     "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "ReadSession" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "readerId" UUID NOT NULL,
    "episodeId" UUID NOT NULL,
    "currentNodeId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReadSession_readerId_idx" ON "ReadSession"("readerId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadSession_readerId_episodeId_key" ON "ReadSession"("readerId", "episodeId");

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "EpisodeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "EpisodeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadSession" ADD CONSTRAINT "ReadSession_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "Reader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadSession" ADD CONSTRAINT "ReadSession_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadSession" ADD CONSTRAINT "ReadSession_currentNodeId_fkey" FOREIGN KEY ("currentNodeId") REFERENCES "EpisodeNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
