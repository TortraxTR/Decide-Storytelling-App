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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoryFavorite_readerId_storyId_key" ON "StoryFavorite"("readerId", "storyId");

-- CreateIndex
CREATE INDEX "StoryFavorite_readerId_idx" ON "StoryFavorite"("readerId");

-- CreateIndex
CREATE INDEX "StoryFavorite_storyId_idx" ON "StoryFavorite"("storyId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryRating_readerId_storyId_key" ON "StoryRating"("readerId", "storyId");

-- CreateIndex
CREATE INDEX "StoryRating_storyId_idx" ON "StoryRating"("storyId");

-- CreateIndex
CREATE INDEX "StoryRating_readerId_idx" ON "StoryRating"("readerId");

-- AddForeignKey
ALTER TABLE "StoryFavorite" ADD CONSTRAINT "StoryFavorite_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "Reader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoryFavorite" ADD CONSTRAINT "StoryFavorite_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoryRating" ADD CONSTRAINT "StoryRating_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "Reader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoryRating" ADD CONSTRAINT "StoryRating_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
