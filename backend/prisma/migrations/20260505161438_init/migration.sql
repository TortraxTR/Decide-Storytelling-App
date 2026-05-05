-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "username" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "passwordHash" TEXT,

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

-- CreateTable
CREATE TABLE "Story" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" VARCHAR(2048),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" UUID NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Episode" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "storyId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EpisodeNode" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "episodeId" UUID NOT NULL,
    "assetHeight" INTEGER,
    "assetKey" VARCHAR(1024) NOT NULL,
    "assetWidth" INTEGER,
    "canvasX" DOUBLE PRECISION,
    "canvasY" DOUBLE PRECISION,
    "textField" TEXT,

    CONSTRAINT "EpisodeNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "text" TEXT,
    "sourceNodeId" UUID NOT NULL,
    "targetNodeId" UUID NOT NULL,
    "episodeId" UUID NOT NULL,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "StoryFavorite" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "readerId" UUID NOT NULL,
    "storyId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryRating" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "readerId" UUID NOT NULL,
    "storyId" UUID NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryRating_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "Story_authorId_idx" ON "Story"("authorId");

-- CreateIndex
CREATE INDEX "Episode_storyId_order_idx" ON "Episode"("storyId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_storyId_order_key" ON "Episode"("storyId", "order");

-- CreateIndex
CREATE INDEX "EpisodeNode_episodeId_idx" ON "EpisodeNode"("episodeId");

-- CreateIndex
CREATE UNIQUE INDEX "EpisodeNode_id_episodeId_key" ON "EpisodeNode"("id", "episodeId");

-- CreateIndex
CREATE INDEX "Decision_episodeId_idx" ON "Decision"("episodeId");

-- CreateIndex
CREATE INDEX "Decision_sourceNodeId_idx" ON "Decision"("sourceNodeId");

-- CreateIndex
CREATE INDEX "Decision_targetNodeId_idx" ON "Decision"("targetNodeId");

-- CreateIndex
CREATE INDEX "ReadSession_readerId_idx" ON "ReadSession"("readerId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadSession_readerId_episodeId_key" ON "ReadSession"("readerId", "episodeId");

-- CreateIndex
CREATE INDEX "StoryFavorite_readerId_idx" ON "StoryFavorite"("readerId");

-- CreateIndex
CREATE INDEX "StoryFavorite_storyId_idx" ON "StoryFavorite"("storyId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryFavorite_readerId_storyId_key" ON "StoryFavorite"("readerId", "storyId");

-- CreateIndex
CREATE INDEX "StoryRating_storyId_idx" ON "StoryRating"("storyId");

-- CreateIndex
CREATE INDEX "StoryRating_readerId_idx" ON "StoryRating"("readerId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryRating_readerId_storyId_key" ON "StoryRating"("readerId", "storyId");

-- AddForeignKey
ALTER TABLE "Author" ADD CONSTRAINT "Author_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reader" ADD CONSTRAINT "Reader_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodeNode" ADD CONSTRAINT "EpisodeNode_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "EpisodeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "EpisodeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadSession" ADD CONSTRAINT "ReadSession_currentNodeId_fkey" FOREIGN KEY ("currentNodeId") REFERENCES "EpisodeNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadSession" ADD CONSTRAINT "ReadSession_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadSession" ADD CONSTRAINT "ReadSession_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "Reader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryFavorite" ADD CONSTRAINT "StoryFavorite_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "Reader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryFavorite" ADD CONSTRAINT "StoryFavorite_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryRating" ADD CONSTRAINT "StoryRating_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "Reader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryRating" ADD CONSTRAINT "StoryRating_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
