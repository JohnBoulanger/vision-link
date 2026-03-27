-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Interest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jobId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "userInterested" BOOLEAN,
    "businessInterested" BOOLEAN,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Interest_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Interest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RegularUser" ("accountId") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Interest" ("businessInterested", "createdAt", "id", "jobId", "updatedAt", "userId", "userInterested") SELECT "businessInterested", "createdAt", "id", "jobId", "updatedAt", "userId", "userInterested" FROM "Interest";
DROP TABLE "Interest";
ALTER TABLE "new_Interest" RENAME TO "Interest";
CREATE UNIQUE INDEX "Interest_jobId_userId_key" ON "Interest"("jobId", "userId");
CREATE TABLE "new_Negotiation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jobId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "businessId" INTEGER NOT NULL,
    "interestId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "candidateDecision" TEXT,
    "businessDecision" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "Negotiation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Negotiation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RegularUser" ("accountId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Negotiation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("accountId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Negotiation_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "Interest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Negotiation" ("businessDecision", "businessId", "candidateDecision", "createdAt", "expiresAt", "id", "interestId", "jobId", "status", "updatedAt", "userId") SELECT "businessDecision", "businessId", "candidateDecision", "createdAt", "expiresAt", "id", "interestId", "jobId", "status", "updatedAt", "userId" FROM "Negotiation";
DROP TABLE "Negotiation";
ALTER TABLE "new_Negotiation" RENAME TO "Negotiation";
CREATE TABLE "new_NegotiationMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "negotiationId" INTEGER NOT NULL,
    "senderAccountId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NegotiationMessage_negotiationId_fkey" FOREIGN KEY ("negotiationId") REFERENCES "Negotiation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NegotiationMessage_senderAccountId_fkey" FOREIGN KEY ("senderAccountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_NegotiationMessage" ("createdAt", "id", "negotiationId", "senderAccountId", "text") SELECT "createdAt", "id", "negotiationId", "senderAccountId", "text" FROM "NegotiationMessage";
DROP TABLE "NegotiationMessage";
ALTER TABLE "new_NegotiationMessage" RENAME TO "NegotiationMessage";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
