-- CreateEnum
CREATE TYPE "AlprVendor" AS ENUM ('FLOCK', 'MOTOROLA_VIGILANT', 'GENETEC', 'REKOR', 'NEOLOGY', 'ELSAG', 'JENOPTIK', 'COBAN', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MountType" AS ENUM ('FIXED_POLE', 'MOBILE_PATROL', 'TRAILER', 'TOLL_GANTRY', 'BUSINESS_OWNED');

-- CreateEnum
CREATE TYPE "OwnerType" AS ENUM ('POLICE_DEPT', 'HOA', 'PRIVATE_BUSINESS', 'TOLL_AUTHORITY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('VERIFIED', 'COMMUNITY_REPORTED', 'UNVERIFIED');

-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('POLICE_STATION', 'SHERIFF_OFFICE', 'ICE_FIELD_OFFICE', 'ICE_DETENTION_FACILITY', 'CBP_OFFICE', 'IMMIGRATION_COURT', 'COURTHOUSE', 'DHS_OFFICE', 'NATIONAL_GUARD_ARMORY');

-- CreateEnum
CREATE TYPE "Jurisdiction" AS ENUM ('FEDERAL', 'STATE', 'COUNTY', 'MUNICIPAL');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CHECKPOINT', 'PATROL_PRESENCE', 'RAID_REPORTED', 'OTHER');

-- CreateTable
CREATE TABLE "AlprCamera" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "vendor" "AlprVendor" NOT NULL DEFAULT 'UNKNOWN',
    "mountType" "MountType",
    "ownerType" "OwnerType",
    "ownerName" TEXT,
    "networkAffiliation" TEXT,
    "source" TEXT NOT NULL,
    "sourceDataset" TEXT,
    "confidence" "Confidence" NOT NULL DEFAULT 'UNVERIFIED',
    "evidencePhotoUrl" TEXT,
    "notes" TEXT,
    "firstReportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" TIMESTAMP(3),

    CONSTRAINT "AlprCamera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FacilityType" NOT NULL,
    "jurisdiction" "Jurisdiction" NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "source" TEXT NOT NULL,
    "operatingHours" TEXT,
    "notes" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityReport" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "description" TEXT,
    "corroborations" INTEGER NOT NULL DEFAULT 1,
    "reporterHash" TEXT NOT NULL,
    "flaggedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlprCamera_latitude_longitude_idx" ON "AlprCamera"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Facility_latitude_longitude_idx" ON "Facility"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Facility_type_idx" ON "Facility"("type");

-- CreateIndex
CREATE INDEX "ActivityReport_latitude_longitude_idx" ON "ActivityReport"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "ActivityReport_expiresAt_idx" ON "ActivityReport"("expiresAt");
