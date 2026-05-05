/*
  Warnings:

  - You are about to drop the column `isEnd` on the `EpisodeNode` table. All the data in the column will be lost.
  - You are about to drop the column `isStart` on the `EpisodeNode` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EpisodeNode" DROP COLUMN "isEnd",
DROP COLUMN "isStart";

-- AlterTable
ALTER TABLE "StoryRating" ALTER COLUMN "updatedAt" DROP DEFAULT;
