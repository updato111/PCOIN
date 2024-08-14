-- CreateEnum
CREATE TYPE "LoginType" AS ENUM ('LOCAL', 'TELEGRAM');

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "login_type" "LoginType" NOT NULL DEFAULT 'TELEGRAM',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "current_hp" INTEGER NOT NULL DEFAULT 3500,
    "earned_coins" BIGINT NOT NULL DEFAULT 0,
    "last_Known_hp_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "max_hp" INTEGER NOT NULL DEFAULT 3500,
    "image_url" TEXT,
    "last_image_changed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referralCode" TEXT NOT NULL,
    "referredById" INTEGER,
    "first_name" TEXT,
    "last_name" TEXT,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "last_daily_earn_claim" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_monthly_earn_claim" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimed_ranks" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unique_username" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_referralCode_key" ON "user"("referralCode");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

