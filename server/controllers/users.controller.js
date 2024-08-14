import "dotenv/config";
import crypto from "crypto";
import { dirname, join } from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import axios from "axios";
import download from "download";
import { fileTypeFromBuffer } from "file-type";
import { nanoid } from "nanoid";
import prisma from "../prismaClient.js";
import { signToken } from "../utils/auth.utils.js";
import { calculateCurrentHp } from "../utils/game.utils.js";
import { TAP_BOOST } from "../constants/tapBoost.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKEN = process.env.BOT_TOKEN;
const REQUIRED_CLICK_HP = 1;

function parseInitData(queryString) {
  return Object.fromEntries(new URLSearchParams(queryString));
}

/**
 * @description To authenticate a user and get auth token
 * @api /api/users/authenticate
 * @access Public
 * @type POST
 */
const authenticateUser = async (req, res) => {
  try {
    let { initData, referralCode } = req.body;

    const data = parseInitData(initData);
    const { hash } = data;
    const username = JSON.parse(data.user).id;
    delete data.hash;

    const dataCheckString = Object.keys(data)
      .sort()
      .map((key) => `${key}=${data[key]}`)
      .join("\n");

    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(TOKEN)
      .digest();

    const computedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (computedHash !== hash) {
      return res.status(400).json({ message: "Authentication failed!" });
    }

    const stringUsername = "" + username;

    let user = await prisma.user.findUnique({
      where: {
        username: stringUsername,
      },
      include: {
        referrals: {
          include: {
            referrals: {
              include: {
                referrals: true,
              },
            },
          },
        },
      },
    });

    let flatArray = [];
    let totalEarnedCoinsByInvite = 0;
    let totalComissions = 0;
    let totalPeopleInvite = 0;

    if (user) {
      const flatten = (user, depth) => {
        let comission;
        if (user.is_premium) {
          comission = depth === 1 ? 0.18 : depth === 2 ? 0.08 : 0.03;
        } else {
          comission = depth === 1 ? 0.08 : depth === 2 ? 0.03 : 0.01;
        }

        if (user.is_premium) {
          totalEarnedCoinsByInvite +=
            depth === 1 ? 88888 : depth === 2 ? 8888 : 888;
        } else {
          totalEarnedCoinsByInvite +=
            depth === 1 ? 8888 : depth === 2 ? 3333 : 888;
        }

        totalPeopleInvite += 1;

        totalComissions += Number(user.earned_coins) * comission;

        flatArray.push({
          id: user.id,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          earned_coins: Number(user.earned_coins) * comission,
          is_premium: user.is_premium,
          depth,
        });

        if (user.referrals && user.referrals.length > 0) {
          user.referrals.forEach((ref) => flatten(ref, depth + 1));
        }
      };

      user.referrals.forEach((user) => flatten(user, 1));
    }

    if (!user) {
      let referredById = null;
      if (referralCode) {
        const referrer = await prisma.user.findUnique({
          where: {
            referralCode,
          },
        });
        if (referrer) {
          referredById = referrer.id;
        }
      }

      user = await prisma.user.create({
        data: {
          username: stringUsername,
          referralCode: nanoid(10),
          referredById,
        },
      });
    }

    const currentHp = calculateCurrentHp(
      user.current_hp,
      user.last_Known_hp_time,
      user.max_hp,
      REQUIRED_CLICK_HP
    );

    const claimedComissions = user.claimed_commissions;

    const updatedUser = await prisma.user.update({
      where: {
        username: stringUsername,
      },
      data: {
        current_hp: currentHp,
        last_Known_hp_time: new Date().toISOString(),
        last_login_time: new Date().toISOString(),
        earned_coins:
          user.earned_coins +
          BigInt(Math.floor(totalEarnedCoinsByInvite)) +
          BigInt(Math.floor(totalComissions)) -
          claimedComissions,
        claimed_commissions:
          BigInt(Math.floor(totalEarnedCoinsByInvite)) +
          BigInt(Math.floor(totalComissions)),
        total_earned_coins_by_invite: totalEarnedCoinsByInvite,
        total_comissions: totalComissions,
      },
    });

    let token = await signToken({ id: stringUsername });
    return res.status(200).json({
      token: `Bearer ${token}`,
      userId: stringUsername,
      referralCode: user.referralCode,
      referrals: flatArray,
      totalEarnedCoinsByInvite,
      totalComissions,
      totalPeopleInvite,
      isPremium: user.is_premium,
      lastDailyEarnClaim: user.last_daily_earn_claim,
      lastMonthlyEarnClaim: user.last_monthly_earn_claim,
      claimedRanks: user.claimed_ranks,
      telegram_channel_task: user.telegram_channel_task,
      twitter_channel_task: user.twitter_channel_task,
      coinPerClick: user.coin_per_click,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "An error occured" });
  }
};

/**
 * @description get user data
 * @api /api/users/:id
 * @access Private
 * @type GET
 */
const getUserData = async (req, res) => {
  try {
    const userData = req.user;
    const userId = req.user.username;

    const currentHp = calculateCurrentHp(
      userData.current_hp,
      userData.last_Known_hp_time,
      userData.max_hp,
      REQUIRED_CLICK_HP
    );

    const updatedUser = await prisma.user.update({
      where: {
        username: userId,
      },
      data: {
        current_hp: currentHp,
        last_Known_hp_time: new Date().toISOString(),
      },
    });

    return res.status(200).json({
      userId,
      currentHp,
      maxHp: updatedUser.max_hp,
      earnedCoins: updatedUser.earned_coins.toString(),
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "An error occured" });
  }
};

/**
 * @description simulate a click and calculate remaining HP
 * @api /api/users/click
 * @access Private
 * @type POST
 */
const userClicked = async (req, res) => {
  try {
    const userData = req.user;
    const userId = req.user.username;
    const { totalNumberClicked } = req.body;

    let realCoinsEarned =
      userData.current_hp - totalNumberClicked * REQUIRED_CLICK_HP;

    if (realCoinsEarned < 0) {
      realCoinsEarned = userData.currentHp;
    } else {
      realCoinsEarned = totalNumberClicked * REQUIRED_CLICK_HP;
    }

    const currentHp = Math.max(
      userData.current_hp - totalNumberClicked * REQUIRED_CLICK_HP,
      0
    );

    const updatedUser = await prisma.user.update({
      where: {
        username: userId,
      },
      data: {
        current_hp: currentHp,
        last_Known_hp_time: new Date().toISOString(),
        earned_coins: BigInt(realCoinsEarned) + userData.earned_coins,
      },
    });

    return res.status(200).json({
      userId,
      currentHp,
      maxHp: updatedUser.max_hp,
      earnedCoins: updatedUser.earned_coins.toString(),
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "An error occured" });
  }
};

/**
 * @description get user profile picture
 * @api /api/users/profilePicture
 * @access Private
 * @type get
 */
const getProfilePicture = async (req, res) => {
  try {
    const userData = req.user;
    const userId = req.user.username;

    const date1 = new Date(userData.last_image_changed);
    const date2 = new Date(new Date().toISOString());
    const diffTime = Math.abs(date2 - date1);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (userData.image_url && diffDays > 0) {
      return res.status(200).json({
        photo: userData.image_url,
      });
    }

    const { data: userProfileFileId } = await axios.post(
      `https://api.telegram.org/bot${TOKEN}/getUserProfilePhotos`,
      {
        user_id: userId,
        limit: 1,
      }
    );

    const fileId = userProfileFileId?.result?.photos?.[0]?.[0]?.file_id;

    if (!fileId) {
      return res.status(200).json({
        photo: null,
      });
    }

    const { data: filePathResult } = await axios.post(
      `https://api.telegram.org/bot${TOKEN}/getFile`,
      { file_id: fileId }
    );

    const filePath = filePathResult.result.file_path;

    const profilePicture = await download(
      `https://api.telegram.org/file/bot${TOKEN}/${filePath}`
    );

    const { ext, mime } = await fileTypeFromBuffer(profilePicture);

    const fileExt = `${ext === "apng" ? "png" : ext}`;

    const finalFileName = `${userId}.${fileExt}`;

    const filePathInServer = join(__dirname, "../uploads");

    fs.writeFile(
      `${filePathInServer}/${finalFileName}`,
      profilePicture,
      (err) => {
        console.log(err);
      }
    );

    const updatedUser = await prisma.user.update({
      where: {
        username: userId,
      },
      data: {
        image_url: finalFileName,
      },
    });

    if (userData.image_url && diffDays > 0) {
      fs.unlinkSync(`${filePathInServer}/${userData.image_url}`);
    }

    return res.status(200).json({
      photo: updatedUser.image_url,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "An error occured", photo: null });
  }
};

/**
 * @description claim user reward
 * @api /api/users/claimReward
 * @access Private
 * @type patch
 */
const claimUserReward = async (req, res) => {
  try {
    const { claimType } = req.body;
    const userData = req.user;
    const userId = req.user.username;

    if (claimType === "TelegramChannelJoin") {
      if (userData.telegram_channel_task === true) {
        return res
          .status(500)
          .json({ message: "Already claimed the channel join task!" });
      } else {
        const { data: checkChannelJoin } = await axios.get(
          `https://api.telegram.org/bot${TOKEN}/getChatMember?chat_id=@pcoin&user_id=${userId}`
        );
        if (
          checkChannelJoin.result.status === "member" ||
          checkChannelJoin.result.status === "restricted" ||
          checkChannelJoin.result.status === "creator" ||
          checkChannelJoin.result.status === "administrator"
        ) {
          const channelJoinRewardAmount = userData.is_premium
            ? 188888n
            : 133888n;

          const updatedUser = await prisma.user.update({
            where: {
              username: userId,
            },
            data: {
              earned_coins: userData.earned_coins + channelJoinRewardAmount,
              telegram_channel_task: true,
            },
          });

          return res.status(200).json({
            telegram_channel_task: true,
            channelJoinReward: channelJoinRewardAmount.toString(),
          });
        } else {
          return res
            .status(500)
            .json({ message: "You haven't joined the channel!" });
        }
      }
    }

    if (claimType === "TwitterJoin") {
      if (userData.twitter_channel_task === true) {
        return res
          .status(500)
          .json({ message: "Already claimed the twitter join task!" });
      } else {
        const twitterRewardAmount = userData.is_premium ? 222888n : 188888n;

        const updatedUser = await prisma.user.update({
          where: {
            username: userId,
          },
          data: {
            earned_coins: userData.earned_coins + twitterRewardAmount,
            twitter_channel_task: true,
          },
        });

        return res.status(200).json({
          twitter_channel_task: true,
          twitterJoinReward: twitterRewardAmount.toString(),
        });
      }
    }

    if (claimType === "DailyReward") {
      const isOneDayPast =
        new Date(new Date().toISOString()) -
          new Date(userData.last_daily_earn_claim) >=
        24 * 60 * 60 * 1000
          ? "Claim"
          : `${parseInt(
              (24 * 60 * 60 * 1000 -
                (new Date(new Date().toISOString()) -
                  new Date(userData.last_daily_earn_claim))) /
                (60 * 60 * 1000)
            )}h`;

      if (isOneDayPast === "Claim") {
        const userRewardAmount = userData.is_premium ? 33888n : 28888n;
        const updatedUser = await prisma.user.update({
          where: {
            username: userId,
          },
          data: {
            earned_coins: userData.earned_coins + userRewardAmount,
            last_daily_earn_claim: new Date().toISOString(),
          },
        });
        return res.status(200).json({
          dailyReward: userRewardAmount.toString(),
          lastClaimTime: updatedUser.last_daily_earn_claim,
        });
      }
    } else if (claimType === "MonthlyReward") {
      const isOneMonthPast =
        new Date(new Date().toISOString()) -
          new Date(userData.last_monthly_earn_claim) >=
        30 * 24 * 60 * 60 * 1000
          ? "Claim"
          : `${parseInt(
              Math.floor(
                30 * 24 * 60 * 60 * 1000 -
                  (new Date(new Date().toISOString()) -
                    new Date(userData.last_monthly_earn_claim))
              ) /
                (24 * 60 * 60 * 1000)
            )}d`;

      if (isOneMonthPast === "Claim") {
        const userRewardAmount = userData.is_premium ? 555888n : 444888n;
        const updatedUser = await prisma.user.update({
          where: {
            username: userId,
          },
          data: {
            earned_coins: userData.earned_coins + userRewardAmount,
            last_monthly_earn_claim: new Date().toISOString(),
          },
        });
        return res.status(200).json({
          monthlyReward: userRewardAmount.toString(),
          lastMonthlyClaimTime: updatedUser.last_daily_earn_claim,
        });
      }
    }

    const rankUpRewardsDetails = [
      {
        name: "Rising Star",
        requirement: 0n,
        image: "/level1.png",
        reward: 8888n,
        premiumReward: 8888n,
      },
      {
        name: "Ace",
        requirement: 188888n,
        image: "/level2.png",
        reward: 88888n,
        premiumReward: 99888n,
      },
      {
        name: "Elite",
        requirement: 388888n,
        image: "/level3.png",
        reward: 188888n,
        premiumReward: 199888n,
      },
      {
        name: "Expert",
        requirement: 788888n,
        image: "/level4.png",
        reward: 388888n,
        premiumReward: 399888n,
      },
      {
        name: "Champion",
        requirement: 1888888n,
        image: "/level5.png",
        reward: 788888n,
        premiumReward: 888888n,
      },
      {
        name: "Master",
        requirement: 3888888n,
        image: "/level6.png",
        reward: 1888888n,
        premiumReward: 2888888n,
      },
      {
        name: "Grandmaster",
        requirement: 18888888n,
        image: "/level7.png",
        reward: 8888888n,
        premiumReward: 10888888n,
      },
      {
        name: "Legend",
        requirement: 188888888n,
        image: "/level8.png",
        reward: 88888888n,
        premiumReward: 100888888n,
      },
    ];

    if (rankUpRewardsDetails.map((item) => item.name).includes(claimType)) {
      if (
        userData.claimed_ranks === null ||
        !userData.claimed_ranks.includes(claimType)
      ) {
        const isPremiumUser = userData.is_premium;

        const rankUpInfo = rankUpRewardsDetails.findIndex(
          (item) => item.name === claimType
        );
        if (rankUpInfo === -1) {
          return res.status(500).json({ message: "Claim type was not found!" });
        }

        if (
          userData.earned_coins +
            BigInt(userData.total_earned_coins_by_invite) +
            BigInt(userData.total_comissions) <
          rankUpRewardsDetails[rankUpInfo].requirement
        ) {
          return res
            .status(500)
            .json({ message: "Not enough balance to claim rank reward!" });
        }

        const updatedUser = await prisma.user.update({
          where: {
            username: userId,
          },
          data: {
            earned_coins:
              userData.earned_coins +
              rankUpRewardsDetails[rankUpInfo][
                isPremiumUser ? "premiumReward" : "reward"
              ],
            claimed_ranks:
              userData.claimed_ranks === null
                ? [claimType]
                : [...userData.claimed_ranks, claimType],
          },
        });

        return res.status(200).json({
          claimedRanks: updatedUser.claimed_ranks,
          rankUpReward:
            rankUpRewardsDetails[rankUpInfo][
              isPremiumUser ? "premiumReward" : "reward"
            ].toString(),
        });
      }
    }

    // const updatedUser = await prisma.user.update({
    //   where: {
    //     username: userId,
    //   },
    //   data: {
    //     image_url: finalFileName,
    //   },
    // });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "An error occured" });
  }
};

/**
 * @description boost tapping
 * @api /api/users/tapboost
 * @access Private
 * @type PATCH
 */
const tapBoost = async (req, res) => {
  try {
    const userData = req.user;
    const userId = req.user.username;

    const nextTapBoostLevel = TAP_BOOST.find(
      (item) => item.cpc > userData.coin_per_click
    );

    if (userData.earned_coins < BigInt(nextTapBoostLevel.price)) {
      return res
        .status(500)
        .json({ message: "don't have enough coins to boost tapping" });
    }

    if (!nextTapBoostLevel) {
      return res.json({
        coinPerClick: userData.coinPerClick,
        earnedCoins: userData.earned_coins.toString(),
      });
    }

    const updatedUser = await prisma.user.update({
      where: {
        username: userId,
      },
      data: {
        coin_per_click: nextTapBoostLevel.cpc,
        earned_coins: userData.earned_coins - BigInt(nextTapBoostLevel.price),
      },
    });

    return res.status(200).json({
      coinPerClick: updatedUser.coin_per_click,
      earnedCoins: updatedUser.earned_coins.toString(),
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "An error occured" });
  }
};

export {
  authenticateUser,
  getUserData,
  userClicked,
  getProfilePicture,
  claimUserReward,
  tapBoost,
};
