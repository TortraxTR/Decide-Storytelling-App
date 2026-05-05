-- CreateTable
CREATE TABLE "Story" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Episode" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "storyId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "authorId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EpisodeNode" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "episodeId" UUID NOT NULL,
    "contentUrl" TEXT NOT NULL,
    "isStart" BOOLEAN NOT NULL DEFAULT false,
    "isEnd" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EpisodeNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "text" TEXT,
    "sourceNodeId" UUID NOT NULL,
    "targetNodeId" UUID NOT NULL,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Story_authorId_idx" ON "Story"("authorId");

-- CreateIndex
CREATE INDEX "Episode_storyId_idx" ON "Episode"("storyId");

-- CreateIndex
CREATE INDEX "Episode_authorId_idx" ON "Episode"("authorId");

-- CreateIndex
CREATE INDEX "EpisodeNode_episodeId_idx" ON "EpisodeNode"("episodeId");

-- CreateIndex
CREATE INDEX "Decision_sourceNodeId_idx" ON "Decision"("sourceNodeId");

-- CreateIndex
CREATE INDEX "Decision_targetNodeId_idx" ON "Decision"("targetNodeId");

-- AddForeignKey
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodeNode" ADD CONSTRAINT "EpisodeNode_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "EpisodeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "EpisodeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
