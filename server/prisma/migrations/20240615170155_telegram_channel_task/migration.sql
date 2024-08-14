-- AlterTable
ALTER TABLE "user" ADD COLUMN     "telegram_channel_task" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "claimed_ranks" DROP DEFAULT;
