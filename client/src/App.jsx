import { useEffect, useState, useRef } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import Loading from "react-loading-components";
import { CopyToClipboard } from "react-copy-to-clipboard";

import "./App.css";
import { numberWithCommas, percentage } from "./utils/game.utils";
import { SERVER_IMAGE_URL } from "./constants";
import CoinClicker from "./components/CoinClicker";
import TapBoost from "./components/TapBoost";

const tele = window.Telegram.WebApp;

function App() {
  const [userAuthData, setUserAuthData] = useState(null);
  const [miningInfo, setMiningInfo] = useState(null);
  const [clickCount, setClickCount] = useState(0);
  const [isHpFillerStarted, setIsHpFillerStarted] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [activePage, setActivePage] = useState("Home");
  const [tChannelJoinBtnLoading, setTChannelJoinBtnLoading] = useState(false);
  const [tChannelCheckTriggered, setTChannelCheckTriggered] = useState(false);
  const [twitterJoinBtnLoading, setTwitterJoinBtnLoading] = useState(false);
  const [twitterCheckTriggered, setTwitterCheckTriggered] = useState(false);

  const timerRef = useRef(null);
  const fillHpTimer = useRef();

  useEffect(() => {
    tele.ready();
    const initData = tele.initData;

    (async () => {
      // const initData =
      //   "query_id=AAGnlxcYAAAAAKeXFxj_RMIL&user=%7B%22id%22%3A404199335%2C%22first_name%22%3A%22Mohammad%20%7C%20Poply%22%2C%22last_name%22%3A%22%22%2C%22username%22%3A%22mmdrz20_03%22%2C%22language_code%22%3A%22en%22%2C%22is_premium%22%3Atrue%2C%22allows_write_to_pm%22%3Atrue%7D&auth_date=1717351115&hash=b64ee7cd8a97d88903de55d0f52d49fec411fbd2187a2c6ac733e7d4c0f8eac7";

      const { data } = await axios.post("/api/users/authenticate", {
        initData,
      });

      setUserAuthData(data);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!userAuthData) {
        return;
      }
      const { data } = await axios.get(`/api/users`, {
        headers: {
          Authorization: userAuthData.token,
        },
      });

      setMiningInfo({
        currentHp: data.currentHp,
        maxHp: data.maxHp,
        earnedCoins: BigInt(Math.floor(data.earnedCoins)),
      });

      const { data: userProfilePicture } = await axios.get(
        `/api/users/profilePicture`,
        {
          headers: {
            Authorization: userAuthData.token,
          },
        }
      );
      setProfilePicture(
        userProfilePicture.photo === null
          ? null
          : `${SERVER_IMAGE_URL}/${userProfilePicture.photo}`
      );
    })();
  }, [userAuthData]);

  useEffect(() => {
    if (miningInfo?.currentHp >= miningInfo?.maxHp && fillHpTimer.current) {
      clearInterval(fillHpTimer.current);
      setIsHpFillerStarted(false);
    }
  }, [miningInfo?.currentHp, miningInfo?.maxHp]);

  useEffect(() => {
    function handleTimer() {
      fillHpTimer.current = setInterval(() => {
        setMiningInfo((prevState) => {
          return {
            ...prevState,
            currentHp:
              prevState?.maxHp - prevState?.currentHp >= 1
                ? prevState?.currentHp + 1
                : prevState?.currentHp +
                  (prevState?.maxHp - prevState?.currentHp)
                ? prevState?.currentHp +
                  (prevState?.maxHp - prevState?.currentHp)
                : 0,
          };
        });
      }, 2 * 1000);
    }

    if (isHpFillerStarted) {
      handleTimer();
    }
  }, [isHpFillerStarted]);

  useEffect(() => {
    setIsHpFillerStarted(true);
  }, []);

  function changeMiningInfo(propName, value) {
    setMiningInfo((prevState) => {
      return { ...prevState, [propName]: value };
    });
  }

  async function handleServerStatusUpdate() {
    try {
      const { data } = await axios.post(
        `/api/users/click`,
        { totalNumberClicked: clickCount + userAuthData?.coinPerClick || 0 },
        {
          headers: {
            Authorization: userAuthData.token,
          },
        }
      );
      setClickCount(0);
    } catch (error) {
      console.log(error);
    }
  }

  const clickHandler = (touchCount) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const requiredHp = userAuthData.coinPerClick * touchCount;

    const clickCountsFit =
      requiredHp > miningInfo.currentHp
        ? Math.floor(touchCount / miningInfo.currentHp)
        : requiredHp;

    const remainedHp = Math.max(
      miningInfo.currentHp - clickCountsFit * requiredHp,
      miningInfo.currentHp - requiredHp
    );

    if (remainedHp < 0) {
      toast.error(`You must have at least ${requiredHp} HP`, {
        id: 1,
      });
      return false;
    }

    setIsHpFillerStarted(true);

    setClickCount(clickCount + clickCountsFit);
    changeMiningInfo(
      "earnedCoins",
      miningInfo.earnedCoins + BigInt(clickCountsFit)
    );

    timerRef.current = setTimeout(() => {
      handleServerStatusUpdate();
      console.log("saved!");
    }, 1 * 1000);

    changeMiningInfo("currentHp", remainedHp);

    return true;
  };

  const hpBarPercentage = percentage(miningInfo?.currentHp, miningInfo?.maxHp);
  const userFirstnameLastname = `${tele.initDataUnsafe.user.first_name} ${tele.initDataUnsafe.user.last_name}`;

  if (!userAuthData || !miningInfo) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-[#B4B8B9] via-[#8A8A8A] to-[#D7D7D5] overflow-y-auto flex justify-center items-center">
        <Loading type="tail_spin" width={80} height={80} fill="#272222" />
      </div>
    );
  }

  const isOneDayPast =
    new Date(new Date().toISOString()) -
      new Date(userAuthData?.lastDailyEarnClaim) >=
    24 * 60 * 60 * 1000
      ? "Claim"
      : `${parseInt(
          (24 * 60 * 60 * 1000 -
            (new Date(new Date().toISOString()) -
              new Date(userAuthData?.lastDailyEarnClaim))) /
            (60 * 60 * 1000)
        )}h`;

  const isOneMonthPast =
    new Date(new Date().toISOString()) -
      new Date(userAuthData?.lastMonthlyEarnClaim) >=
    30 * 24 * 60 * 60 * 1000
      ? "Claim"
      : `${parseInt(
          Math.floor(
            30 * 24 * 60 * 60 * 1000 -
              (new Date(new Date().toISOString()) -
                new Date(userAuthData?.lastMonthlyEarnClaim))
          ) /
            (24 * 60 * 60 * 1000)
        )}d`;

  const claimDailyReward = async () => {
    if (isOneDayPast !== "Claim") {
      toast("One day is not past!");
      return;
    }

    try {
      const { data } = await axios.patch(
        `/api/users/claimReward`,
        { claimType: "DailyReward" },
        {
          headers: {
            Authorization: userAuthData.token,
          },
        }
      );
      changeMiningInfo(
        "earnedCoins",
        miningInfo.earnedCoins + BigInt(data.dailyReward)
      );
      setUserAuthData((prevState) => {
        return {
          ...prevState,
          lastDailyEarnClaim: data.lastClaimTime,
        };
      });
    } catch (error) {
      toast.error("Something went wrong!");
    }
  };

  const claimMonthlyReward = async () => {
    if (isOneMonthPast !== "Claim") {
      toast("One month is not past!");
      return;
    }

    try {
      const { data } = await axios.patch(
        `/api/users/claimReward`,
        { claimType: "MonthlyReward" },
        {
          headers: {
            Authorization: userAuthData.token,
          },
        }
      );
      changeMiningInfo(
        "earnedCoins",
        miningInfo.earnedCoins + BigInt(data.monthlyReward)
      );
      setUserAuthData((prevState) => {
        return {
          ...prevState,
          lastMonthlyEarnClaim: data.lastMonthlyClaimTime,
        };
      });
    } catch (error) {
      toast.error("Something went wrong!");
    }
  };

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

  const claimRankUpReward = async (rankName) => {
    try {
      const { data } = await axios.patch(
        `/api/users/claimReward`,
        { claimType: rankName },
        {
          headers: {
            Authorization: userAuthData.token,
          },
        }
      );
      changeMiningInfo(
        "earnedCoins",
        miningInfo.earnedCoins + BigInt(data.rankUpReward)
      );
      setUserAuthData((prevState) => {
        return {
          ...prevState,
          claimedRanks: data.claimedRanks,
        };
      });
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong!");
    }
  };

  const checkTelegramChannelJoin = async () => {
    if (userAuthData.telegram_channel_task === true) {
      return;
    } else if (
      userAuthData.telegram_channel_task === false &&
      !tChannelJoinBtnLoading
    ) {
      setTChannelJoinBtnLoading(true);
    } else if (
      userAuthData.telegram_channel_task === false &&
      tChannelJoinBtnLoading &&
      !tChannelCheckTriggered
    ) {
      // call the api to check for the user join status
      try {
        setTChannelCheckTriggered(true);
        const { data } = await axios.patch(
          `/api/users/claimReward`,
          { claimType: "TelegramChannelJoin" },
          {
            headers: {
              Authorization: userAuthData.token,
            },
          }
        );
        changeMiningInfo(
          "earnedCoins",
          miningInfo.earnedCoins + BigInt(data.channelJoinReward)
        );
        setUserAuthData((prevState) => {
          return {
            ...prevState,
            telegram_channel_task: data.telegram_channel_task,
          };
        });
      } catch (error) {
        console.log(error);
        if (error?.response) {
          toast.error(error.response.data.message);
        }
      }
    }
  };

  const checkTwitterChannelJoin = async () => {
    if (userAuthData.twitter_channel_task === true) {
      return;
    } else if (
      userAuthData.twitter_channel_task === false &&
      !twitterJoinBtnLoading
    ) {
      setTwitterJoinBtnLoading(true);
    } else if (
      userAuthData.twitter_channel_task === false &&
      twitterJoinBtnLoading &&
      !twitterCheckTriggered
    ) {
      // call the api to check for the user join status
      try {
        setTwitterCheckTriggered(true);
        const { data } = await axios.patch(
          `/api/users/claimReward`,
          { claimType: "TwitterJoin" },
          {
            headers: {
              Authorization: userAuthData.token,
            },
          }
        );
        changeMiningInfo(
          "earnedCoins",
          miningInfo.earnedCoins + BigInt(data.twitterJoinReward)
        );
        setUserAuthData((prevState) => {
          return {
            ...prevState,
            twitter_channel_task: data.twitter_channel_task,
          };
        });
      } catch (error) {
        console.log(error);
        if (error?.response) {
          toast.error(error.response.data.message);
        }
      }
    }
  };

  return (
    <>
      <div className="w-full h-screen bg-gradient-to-br from-[#B4B8B9] via-[#8A8A8A] to-[#D7D7D5] flex flex-col justify-evenly">
        <div className="flex-1">
          {activePage === "Home" && (
            <>
              <div className="w-full flex justify-center pt-7">
                <div className="w-[80%] pl-[2px] pr-4 py-1 bg-black/40 rounded-l-full rounded-tr-full flex items-center gap-x-4">
                  <div className="w-[61px] aspect-square rounded-full bg-white flex justify-center items-center">
                    <div className="w-[88%] aspect-square rounded-full bg-gradient-to-b from-[#B3B7B7] to-[#D9D9D7] flex justify-center items-center">
                      {profilePicture ? (
                        <img
                          src={profilePicture}
                          alt=""
                          className="w-full aspect-square rounded-full"
                        />
                      ) : (
                        <img
                          src="/user.png"
                          alt=""
                          className="w-[70%] aspect-square rounded-full"
                        />
                      )}
                    </div>
                  </div>
                  <div className="h-full flex flex-col justify-center">
                    <h2 className="font-semibold text-lg text-white leading-none">
                      {/* Community name */}
                      {userFirstnameLastname.length <= 16
                        ? userFirstnameLastname
                        : userFirstnameLastname.slice(0, 16) + "..."}
                    </h2>
                    {/* <p className="font-semibold text-sm text-white mt-0.5">
              community rank
            </p>
            <p className="font-semibold text-xs text-white">
              community coins {clickCount}
            </p> */}
                  </div>
                </div>
              </div>
              <div className="w-full min-h-[340px] flex justify-center items-center mt-4">
                <CoinClicker
                  onclickHandle={clickHandler}
                  userAuthData={userAuthData}
                />
                <img
                  src="/flash.png"
                  className="w-[345px] absolute left-1/2 transform -translate-x-1/2 top-[100px]"
                  alt=""
                />
              </div>
              <div className="flex items-center justify-center gap-x-4 px-2">
                <img src="/coin.png" className="w-8" alt="" />
                <h3 className="font-bold text-3xl text-white [text-shadow:_0_2px_0_rgb(0_0_0_/_40%)]">
                  {numberWithCommas(
                    typeof miningInfo?.earnedCoins === "undefined"
                      ? 0n
                      : miningInfo?.earnedCoins
                  )}
                </h3>
              </div>
              {/* <div className="flex items-center justify-center gap-x-2 px-2 mt-1">
                <img src="/diamond.png" className="w-4" alt="" />
                <h3 className="text-sm text-blue-100">Diamond</h3>
              </div> */}
              <div className="flex items-center justify-center px-2 gap-x-3 mt-2">
                <div className="flex flex-row gap-x-1.5">
                  <div>
                    <img src="/hp.png" className="w-3" alt="" />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-lg leading-none">
                      {miningInfo.currentHp}
                    </span>
                    <span className="text-[10px] font-semibold text-gray-700">
                      /{miningInfo.maxHp}
                    </span>
                  </div>
                </div>
                <div className="w-[250px] rounded-full h-[11px] bg-transparent shadow-[inset_0px_2px_3px_3px_#00000024]">
                  <div
                    style={{ width: `${hpBarPercentage}%` }}
                    className={`h-full bg-white rounded-full shadow-[inset_0px_0px_5px_2px_#656d7a]`}
                  />
                </div>
              </div>
            </>
          )}
          {activePage === "Invite" && (
            <div
              className="px-4 flex flex-col max-h-[calc(100vh-104px)]"
              style={{ maxHeight: "calc(100vh - 104px)" }}
            >
              <div className="w-full flex flex-col items-center pt-7 font-bold text-3xl">
                <h2>{userAuthData?.totalPeopleInvite} Referrals</h2>
                <h3 className="text-sm mt-1">
                  +
                  {numberWithCommas(
                    Math.floor(userAuthData?.totalEarnedCoinsByInvite)
                  )}
                </h3>
              </div>
              <div className="w-full flex flex-col mt-5 bg-white/25 p-2 rounded-lg">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-xl">My invite link:</h3>
                  <CopyToClipboard
                    text={`https://t.me/Probablycoinbot?start=${userAuthData?.referralCode}`}
                    onCopy={() => toast.success("Copied!")}
                  >
                    <button className="px-4 py-2 bg-white rounded-lg leading-none font-semibold shadow-[inset_0px_0px_6px_1px_#656d7a]">
                      Copy
                    </button>
                  </CopyToClipboard>
                </div>
                <input
                  type="text"
                  readOnly
                  className="text-sm bg-transparent mt-2 border-none focus:outline-none focus:border-none"
                  value={`https://t.me/Probablycoinbot?start=${userAuthData?.referralCode}`}
                />
              </div>
              <div className="w-full bg-white/25 rounded-lg overflow-hidden mt-2 min-h-[200px]">
                <img src="/referral.png" />
              </div>
              <div className="mt-2">
                <h3 className="font-semibold text-xl">My Referrals:</h3>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 mt-2">
                {userAuthData?.referrals.map((item) => {
                  return (
                    <div
                      className="w-full flex flex-col items-start bg-white/25 p-2 rounded-lg"
                      key={item.username}
                    >
                      <div className="w-full flex justify-between">
                        <h3 className="flex items-center gap-x-2">
                          <span>
                            {`${item?.first_name} ${item?.last_name}`.length <=
                            20
                              ? `${item?.first_name || ""} ${
                                  item?.last_name || ""
                                }`
                              : `${item?.first_name || ""} ${
                                  item?.last_name || ""
                                }`.slice(0, 20) + "..."}
                          </span>
                          {item?.is_premium && (
                            <img src="/p-logo.webp" className="w-4" />
                          )}
                        </h3>
                        <h3>
                          +
                          {item?.is_premium
                            ? item?.depth === 1
                              ? 18
                              : item?.depth === 2
                              ? 8
                              : 3
                            : item?.depth === 1
                            ? 8
                            : item?.depth === 2
                            ? 3
                            : 1}
                          %
                        </h3>
                      </div>
                      <div className="flex items-center justify-center gap-x-2 mt-1">
                        <img src="/coin.png" className="w-4" alt="" />
                        <h3 className="font-bold text-lg leading-none text-white [text-shadow:_0_2px_0_rgb(0_0_0_/_40%)]">
                          {Math.floor(item?.earned_coins)}
                        </h3>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {activePage === "Earn" && (
            <div
              className="px-4 flex flex-col max-h-[calc(100vh-104px)]"
              style={{ maxHeight: "calc(100vh - 104px)" }}
            >
              <div className="flex items-center justify-center gap-x-4 px-2 pt-7">
                <img src="/coin.png" className="w-8" alt="" />
                <h3 className="font-bold text-3xl text-white [text-shadow:_0_2px_0_rgb(0_0_0_/_40%)]">
                  {numberWithCommas(
                    typeof miningInfo?.earnedCoins === "undefined"
                      ? 0n
                      : miningInfo?.earnedCoins
                  )}
                </h3>
              </div>
              <div className="flex-1 overflow-auto w-full px-2 mt-6 space-y-2">
                <div className="px-2 flex items-center justify-between bg-gray-700/10 py-1.5 rounded-lg">
                  <div className="flex items-center gap-x-3">
                    <img
                      src="/24-hours.png"
                      alt="daily reward"
                      className="w-10 aspect-square"
                    />
                    <div>
                      <p className="text-white gap-x-2 flex items-center">
                        <span>Daily reward</span>
                        {userAuthData?.isPremium && (
                          <img src="/p-logo.webp" className="w-4" />
                        )}
                      </p>
                      <div className="flex items-center gap-x-2">
                        <img
                          src="/coin.png"
                          className="w-4 aspect-square"
                          alt=""
                        />
                        <h3 className="font-medium text-base text-white">
                          {userAuthData?.isPremium ? "33,888" : "28,888"}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={claimDailyReward}
                    disabled={isOneDayPast !== "Claim"}
                    className={`${
                      isOneDayPast !== "Claim"
                        ? "opacity-70 cursor-not-allowed bg-white"
                        : "bg-green-500 text-white"
                    } px-4 py-2 rounded-lg leading-none font-semibold shadow-[inset_0px_0px_6px_1px_#656d7a]`}
                  >
                    {isOneDayPast === "Claim" ? "Claim" : isOneDayPast}
                  </button>
                </div>
                <div className="px-2 flex items-center justify-between bg-gray-700/10 py-1.5 rounded-lg">
                  <div className="flex items-center gap-x-3">
                    <img
                      src="/month.png"
                      alt="daily reward"
                      className="w-10 aspect-square"
                    />
                    <div>
                      <p className="text-white flex items-center gap-x-2">
                        <span>Monthly reward</span>
                        {userAuthData?.isPremium && (
                          <img src="/p-logo.webp" className="w-4" />
                        )}
                      </p>
                      <div className="flex items-center gap-x-2">
                        <img
                          src="/coin.png"
                          className="w-4 aspect-square"
                          alt=""
                        />
                        <h3 className="font-medium text-base text-white">
                          {userAuthData?.isPremium ? "555,888" : "444,888"}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={claimMonthlyReward}
                    disabled={isOneMonthPast !== "Claim"}
                    className={`${
                      isOneMonthPast !== "Claim"
                        ? "opacity-70 cursor-not-allowed bg-white"
                        : "bg-green-500 text-white"
                    } px-4 py-2 rounded-lg leading-none font-semibold shadow-[inset_0px_0px_6px_1px_#656d7a]`}
                  >
                    {isOneMonthPast === "Claim" ? "Claim" : isOneMonthPast}
                  </button>
                </div>
                <div className="px-2 flex items-center justify-between bg-gray-700/10 py-1.5 rounded-lg">
                  <div className="flex items-center gap-x-3">
                    <img
                      src="/telegram.png"
                      alt="daily reward"
                      className="w-10"
                    />
                    <div>
                      <div className="text-white flex items-center gap-x-2">
                        <p className="text-sm">Telegram Channel Join</p>
                        {userAuthData?.isPremium && (
                          <img src="/p-logo.webp" className="w-4" />
                        )}
                      </div>
                      <div className="flex items-center gap-x-2">
                        <img
                          src="/coin.png"
                          className="w-4 aspect-square"
                          alt=""
                        />
                        <h3 className="font-medium text-base text-white">
                          {userAuthData?.isPremium ? "188,888" : "133,888"}
                        </h3>
                      </div>
                    </div>
                  </div>
                  {userAuthData.telegram_channel_task === false &&
                  !tChannelJoinBtnLoading ? (
                    <a
                      onClick={checkTelegramChannelJoin}
                      href="https://t.me/pcoin"
                      target="_blank"
                      className="px-4 py-2 rounded-lg leading-none font-semibold shadow-[inset_0px_0px_6px_1px_#656d7a] bg-green-500 text-white"
                    >
                      Join
                    </a>
                  ) : (
                    <button
                      onClick={checkTelegramChannelJoin}
                      disabled={
                        userAuthData.telegram_channel_task ||
                        tChannelCheckTriggered
                      }
                      className={`${
                        userAuthData.telegram_channel_task ||
                        tChannelCheckTriggered
                          ? "opacity-70 cursor-not-allowed bg-white"
                          : "bg-green-500 text-white"
                      } px-4 py-2 rounded-lg leading-none font-semibold shadow-[inset_0px_0px_6px_1px_#656d7a]`}
                    >
                      {userAuthData.telegram_channel_task === true && "Claimed"}
                      {userAuthData.telegram_channel_task === false &&
                        tChannelJoinBtnLoading &&
                        !tChannelCheckTriggered &&
                        "Check"}
                      {userAuthData.telegram_channel_task === false &&
                        tChannelJoinBtnLoading &&
                        tChannelCheckTriggered &&
                        "Checked"}
                    </button>
                  )}
                </div>
                <div className="px-2 flex items-center justify-between bg-gray-700/10 py-1.5 rounded-lg">
                  <div className="flex items-center gap-x-3">
                    <img src="/x.png" alt="daily reward" className="w-10" />
                    <div>
                      <div className="text-white flex items-center gap-x-2">
                        <p className="text-sm">Follow Twitter</p>
                        {userAuthData?.isPremium && (
                          <img src="/p-logo.webp" className="w-4" />
                        )}
                      </div>
                      <div className="flex items-center gap-x-2">
                        <img
                          src="/coin.png"
                          className="w-4 aspect-square"
                          alt=""
                        />
                        <h3 className="font-medium text-base text-white">
                          {userAuthData?.isPremium ? "222,888" : "188,888"}
                        </h3>
                      </div>
                    </div>
                  </div>
                  {userAuthData.twitter_channel_task === false &&
                  !twitterJoinBtnLoading ? (
                    <a
                      onClick={checkTwitterChannelJoin}
                      href="https://x.com/probablycoin"
                      target="_blank"
                      className="px-4 py-2 rounded-lg leading-none font-semibold shadow-[inset_0px_0px_6px_1px_#656d7a] bg-green-500 text-white"
                    >
                      Join
                    </a>
                  ) : (
                    <button
                      onClick={checkTwitterChannelJoin}
                      disabled={
                        userAuthData.twitter_channel_task ||
                        twitterCheckTriggered
                      }
                      className={`${
                        userAuthData.twitter_channel_task ||
                        twitterCheckTriggered
                          ? "opacity-70 cursor-not-allowed bg-white"
                          : "bg-green-500 text-white"
                      } px-4 py-2 rounded-lg leading-none font-semibold shadow-[inset_0px_0px_6px_1px_#656d7a]`}
                    >
                      {userAuthData.twitter_channel_task === true && "Claimed"}
                      {userAuthData.twitter_channel_task === false &&
                        twitterJoinBtnLoading &&
                        !twitterCheckTriggered &&
                        "Check"}
                      {userAuthData.twitter_channel_task === false &&
                        twitterJoinBtnLoading &&
                        twitterCheckTriggered &&
                        "Checked"}
                    </button>
                  )}
                </div>
                <h2 className="text-xl">Rankup Reward</h2>
                {rankUpRewardsDetails.map((rank) => {
                  let isActive = false;

                  try {
                    if (userAuthData.claimedRanks === null) {
                      if (
                        miningInfo.earnedCoins +
                          BigInt(userAuthData.totalEarnedCoinsByInvite) +
                          BigInt(userAuthData.totalComissions) >=
                        rank.requirement
                      ) {
                        isActive = true;
                      }
                    } else {
                      if (!userAuthData.claimedRanks.includes(rank.name)) {
                        if (
                          miningInfo.earnedCoins +
                            BigInt(userAuthData.totalEarnedCoinsByInvite) +
                            BigInt(userAuthData.totalComissions) >=
                          rank.requirement
                        ) {
                          isActive = true;
                        }
                      }
                    }
                  } catch (error) {
                    console.log(error);
                  }

                  return (
                    <div
                      key={rank.name}
                      className="px-2 flex items-center justify-between bg-gray-700/10 py-1.5 rounded-lg"
                    >
                      <div className="flex items-center gap-x-3">
                        <img
                          src={rank.image}
                          alt="daily reward"
                          className="w-10 h-auto"
                        />
                        <div>
                          <p className="text-white flex items-center gap-x-1">
                            <span className="">{rank.name}</span>
                            <span className="text-xs text-slate-200">
                              | require +{numberWithCommas(rank.requirement)}
                            </span>
                          </p>
                          <div className="flex items-center gap-x-2">
                            <img
                              src="/coin.png"
                              className="w-4 aspect-square"
                              alt=""
                            />
                            <h3 className="font-medium text-base text-white flex items-center gap-x-2">
                              <span>
                                {numberWithCommas(
                                  userAuthData?.isPremium
                                    ? rank.premiumReward
                                    : rank.reward
                                )}
                              </span>
                              {userAuthData?.isPremium && (
                                <img src="/p-logo.webp" className="w-4" />
                              )}
                            </h3>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => claimRankUpReward(rank.name)}
                        disabled={!isActive}
                        className={`${
                          isActive
                            ? "bg-green-500 text-white"
                            : "opacity-70 cursor-not-allowed bg-white"
                        } px-4 py-2 rounded-lg leading-none font-semibold shadow-[inset_0px_0px_6px_1px_#656d7a]`}
                      >
                        {userAuthData?.claimedRanks?.includes(rank.name)
                          ? "Claimed"
                          : "Claim"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {activePage === "Boost" && (
            <TapBoost
              userAuthData={userAuthData}
              miningInfo={miningInfo}
              changeMiningInfo={changeMiningInfo}
              setUserAuthData={setUserAuthData}
            />
          )}
        </div>

        <div className="flex justify-between px-2 pt-3 pb-6">
          <button
            onClick={() =>
              toast("Coming soon!", {
                icon: "ℹ",
                id: 2,
              })
            }
            className="relative opacity-70 flex flex-col items-center justify-center bg-black/30 w-[62px] py-2 rounded-t-full shadow-[inset_0px_0px_12px_2px_#2b3038]"
          >
            <img src="/donate.png" className="w-5" alt="" />
            <h4 className="mt-1.5 font-bold text-xs text-white">DONATE</h4>
          </button>
          <button
            onClick={() => setActivePage("Earn")}
            className="relative flex flex-col items-center justify-center bg-black/30 w-[62px] py-2 rounded-t-full shadow-[inset_0px_0px_12px_2px_#2b3038]"
          >
            <img src="/earn.png" className="w-[33px]" alt="" />
            <h4 className="mt-1.5 font-bold text-xs text-white">EARN</h4>
            {activePage === "Earn" && (
              <div className="h-[6px] w-full absolute bottom-0 right-0 left-0 bg-white shadow-[inset_0px_0px_1px_1px_#656d7a]" />
            )}
          </button>
          <button
            className="relative flex flex-col items-center justify-center bg-black/30 w-[62px] py-2 rounded-t-full shadow-[inset_0px_0px_12px_2px_#2b3038]"
            onClick={() => setActivePage("Home")}
          >
            <img src="/home.png" className="w-[33px]" alt="" />
            <h4 className="mt-1.5 font-bold text-xs text-white">HOME</h4>
            {activePage === "Home" && (
              <div className="h-[6px] w-full absolute bottom-0 right-0 left-0 bg-white shadow-[inset_0px_0px_1px_1px_#656d7a]" />
            )}
          </button>
          <button
            className="relative flex flex-col items-center justify-center bg-black/30 w-[62px] py-2 rounded-t-full shadow-[inset_0px_0px_12px_2px_#2b3038]"
            onClick={() => setActivePage("Invite")}
          >
            <img src="/invite.png" className="w-[38px] mt-2" alt="" />
            <h4 className="mt-1.5 font-bold text-xs text-white">INVITE</h4>
            {activePage === "Invite" && (
              <div className="h-[6px] w-full absolute bottom-0 right-0 left-0 bg-white shadow-[inset_0px_0px_1px_1px_#656d7a]" />
            )}
          </button>
          <button
            className="relative flex flex-col items-center justify-center bg-black/30 w-[62px] py-2 rounded-t-full shadow-[inset_0px_0px_12px_2px_#2b3038]"
            onClick={() => setActivePage("Boost")}
          >
            <img src="/boost.png" className="w-[28px] mt-0.5" alt="" />
            <h4 className="mt-1.5 font-bold text-xs text-white">BOOST</h4>
            {activePage === "Boost" && (
              <div className="h-[6px] w-full absolute bottom-0 right-0 left-0 bg-white shadow-[inset_0px_0px_1px_1px_#656d7a]" />
            )}
          </button>
        </div>
      </div>

      <Toaster />
    </>
  );
}

export default App;
