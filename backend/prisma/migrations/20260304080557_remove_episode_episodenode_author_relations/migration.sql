/*
  Warnings:

  - You are about to drop the column `authorId` on the `Episode` table. All the data in the column will be lost.
  - You are about to alter the column `thumbnail` on the `Episode` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(2048)`.
  - You are about to alter the column `contentUrl` on the `EpisodeNode` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(2048)`.
  - You are about to alter the column `thumbnail` on the `Story` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(2048)`.
  - A unique constraint covering the columns `[storyId,order]` on the table `Episode` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `authorId` on the `Story` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropIndex
DROP INDEX "Episode_authorId_idx";

-- DropIndex
DROP INDEX "Episode_storyId_idx";

-- AlterTable
ALTER TABLE "Episode" DROP COLUMN "authorId",
ALTER COLUMN "thumbnail" SET DATA TYPE VARCHAR(2048),
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "EpisodeNode" ALTER COLUMN "contentUrl" SET DATA TYPE VARCHAR(2048);

-- AlterTable
ALTER TABLE "Story" ALTER COLUMN "thumbnail" SET DATA TYPE VARCHAR(2048),
DROP COLUMN "authorId",
ADD COLUMN     "authorId" UUID NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "username" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Author" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Author_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reader" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reader_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Author_userId_key" ON "Author"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Reader_userId_key" ON "Reader"("userId");

-- CreateIndex
CREATE INDEX "Episode_storyId_order_idx" ON "Episode"("storyId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_storyId_order_key" ON "Episode"("storyId", "order");

-- CreateIndex
CREATE INDEX "Story_authorId_idx" ON "Story"("authorId");

-- AddForeignKey
ALTER TABLE "Author" ADD CONSTRAINT "Author_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reader" ADD CONSTRAINT "Reader_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE CASCADE ON UPDATE CASCADE;
