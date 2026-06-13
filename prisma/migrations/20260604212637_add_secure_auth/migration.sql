-- AlterTable
ALTER TABLE "User" ADD COLUMN     "invalidLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "passwordHash" TEXT;
