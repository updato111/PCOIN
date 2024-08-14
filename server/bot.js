import "dotenv/config";
import { Telegraf } from "telegraf";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";
import rateLimit from "telegraf-ratelimit";
import Bottleneck from "bottleneck";
import prisma from "./prismaClient.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, "assets", "pcoin.jpg");
const TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(TOKEN, {
  handlerTimeout: Infinity,
});
const web_link = "https://hilarious-syrniki-70ab47.netlify.app/";

// Create a Bottleneck limiter
const limiter = new Bottleneck({
  minTime: 5000, // Minimum time between each message in milliseconds (5 messages per second)
  maxConcurrent: 1, // Maximum number of concurrent requests
});

// Rate limit middleware configuration
const limitConfig = {
  window: 5000, // 5 second window
  limit: 1, // 1 message per window
  onLimitExceeded: (ctx, next) => {
    console.log("hit the rate limit");
    // ctx.reply("Rate limit exceeded, please try again later.");
  },
};

// Apply rate limiting middleware
bot.use(rateLimit(limitConfig));

bot.start(async (ctx) => {
  try {
    await limiter.schedule(async () => {
      await ctx.telegram.sendChatAction(ctx.chat.id, "typing");

      const referralCode = ctx.message.text.split(" ")?.[1];
      const isPremium = ctx.message.from.is_premium || false;

      const stringUsername = "" + ctx.message.from.id;

      let user = await prisma.user.findUnique({
        where: {
          username: stringUsername,
        },
      });

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
            first_name: ctx.message.from.first_name,
            last_name: ctx.message.from.last_name,
            earned_coins: referredById ? 8888n : 0n,
            referredById,
            is_premium: isPremium,
          },
        });
      }

      const username = ctx.chat.username;

      await ctx.telegram.sendPhoto(
        ctx.chat.id,
        {
          source: filePath,
        },
        {
          caption: `🎉 Hey${
            username ? ", @" + username : ""
          }! Welcome to the Revolution with Probablycoin! 🎉\n\n🔥 Get ready to tap into a world of endless possibilities with Probably! 🚀\n\n👆 Just tap on the coin and watch your balance skyrocket! 🦾\n\n💰 How much is $Pcoin worth? it's Probably Everything! The excitement is in the mystery! 💸\n\n🫀 Got friends, family, or co-workers? Bring them all into the game! The more, the merrier! 👥\n\n👫 More friends = More coins! 👫\n\nInvite everyone and watch your Pcoin stash multiply! 📈✨\n\n👆 Start tapping NOW and let the wealth roll in! 🪙💥\n\nJoin the fun, spread the word, and tap your way to riches! 🌟`,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🔥 Join Channel",
                  url: "https://t.me/Pcoin",
                },
              ],
              [
                {
                  text: "🌟 Follow X",
                  url: "https://x.com/probablycoin",
                },
              ],
              [
                {
                  text: "⚡ Play now!",
                  web_app: {
                    url: web_link,
                  },
                },
              ],
            ],
          },
        }
      );

      await ctx.setChatMenuButton({
        type: "web_app",
        text: "🚀 Play",
        web_app: {
          url: web_link,
        },
      });
    });
  } catch (error) {
    console.log("error is: ", error);
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.log("error is seen!");
  // if (err.code === 403) {
  //   // User blocked the bot
  //   console.log(`User ${ctx.message.chat.id} blocked the bot.`);
  // } else if (err.code === 429) {
  //   // Handle rate limit error
  //   const retryAfter = err.parameters.retry_after;
  //   console.log(`Rate limit exceeded. Retrying in ${retryAfter} seconds...`);
  //   setTimeout(() => {
  //     ctx.reply("Rate limit exceeded, please try again later.");
  //   }, retryAfter * 1000);
  // } else {
  //   console.error("Error occurred:", err);
  // }
});

// bot.command("welcome", (ctx) => {});

bot.launch();
