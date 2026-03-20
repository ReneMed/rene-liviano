-- CreateTable
CREATE TABLE "ComplementaryAnalysisReading" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    CONSTRAINT "ComplementaryAnalysisReading_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ComplementaryAnalysisReading_visitId_idx" ON "ComplementaryAnalysisReading"("visitId");
