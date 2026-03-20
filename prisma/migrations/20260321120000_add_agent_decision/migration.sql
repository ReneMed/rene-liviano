-- CreateTable
CREATE TABLE "AgentDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitId" TEXT NOT NULL,
    "agentKey" TEXT NOT NULL,
    "activated" BOOLEAN NOT NULL,
    "reason" TEXT NOT NULL,
    "matchedPattern" TEXT,
    "source" TEXT NOT NULL,
    CONSTRAINT "AgentDecision_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
