-- CreateTable
CREATE TABLE "LegalAidOrg" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" TEXT,
    "website" TEXT,
    "languages" TEXT[],
    "specialty" TEXT,
    "hours" TEXT,
    "notes" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalAidOrg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowYourRightsContent" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowYourRightsContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LegalAidOrg_latitude_longitude_idx" ON "LegalAidOrg"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "KnowYourRightsContent_state_language_key" ON "KnowYourRightsContent"("state", "language");
