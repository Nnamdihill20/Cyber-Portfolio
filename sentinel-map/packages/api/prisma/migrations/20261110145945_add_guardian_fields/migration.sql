-- AlterTable
ALTER TABLE "ActivityReport" ADD COLUMN     "guardianFlagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "guardianReason" TEXT;
