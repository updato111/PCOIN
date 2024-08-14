-- AlterTable
ALTER TABLE "user" ADD COLUMN     "total_comissions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_earned_coins_by_invite" INTEGER NOT NULL DEFAULT 0;
