import toast from "react-hot-toast";
import axios from "axios";
import { TAP_BOOST } from "../constants/tapBoost";
import { numberWithCommas } from "../utils/game.utils";

const TapBoost = ({
  userAuthData,
  miningInfo,
  changeMiningInfo,
  setUserAuthData,
}) => {
  const nextTapBoostLevel = TAP_BOOST.find(
    (item) => item.cpc > userAuthData?.coinPerClick
  );

  const tapBoostHandler = async () => {
    console.log("clicked!");
    try {
      const { data } = await axios.patch(
        `/api/users/tapboost`,
        {},
        {
          headers: {
            Authorization: userAuthData.token,
          },
        }
      );
      changeMiningInfo("earnedCoins", BigInt(data.earnedCoins));
      setUserAuthData((prevState) => {
        return {
          ...prevState,
          coinPerClick: data.coinPerClick,
        };
      });
      toast.success("You successfully boosted tapping!");
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong!");
    }
  };

  return (
    <div
      className="px-4 flex flex-col max-h-[calc(100vh-104px)]"
      style={{ maxHeight: "calc(100vh - 104px)" }}
    >
      <h4 className="font-semibold text-xl mt-5">Boosters</h4>
      <div className="flex-1 overflow-auto w-full mt-6 space-y-2">
        <div className="px-2 flex items-center justify-between bg-gray-700/10 py-1.5 rounded-lg">
          <div className="flex items-center gap-x-3">
            <img
              src="/tap.png"
              alt="daily reward"
              className="w-10 aspect-square"
            />
            <div>
              <p className="text-white gap-x-2 flex items-center">
                <span>Tap boost</span>
              </p>
              <div className="flex items-center gap-x-2">
                <img src="/coin.png" className="w-4 aspect-square" alt="" />
                <h3 className="font-medium text-base text-white">
                  {!nextTapBoostLevel
                    ? "Maximum level"
                    : numberWithCommas(nextTapBoostLevel.price)}
                </h3>
              </div>
            </div>
          </div>
          <button
            onClick={tapBoostHandler}
            disabled={
              !nextTapBoostLevel ||
              miningInfo?.earnedCoins < BigInt(nextTapBoostLevel?.price)
            }
            className={`
              ${
                !nextTapBoostLevel ||
                miningInfo?.earnedCoins < BigInt(nextTapBoostLevel?.price)
                  ? "bg-white text-black opacity-70 cursor-not-allowed"
                  : "bg-green-500 text-white"
              } px-4 py-2 rounded-lg leading-none font-semibold shadow-[inset_0px_0px_6px_1px_#656d7a]`}
          >
            {!nextTapBoostLevel
              ? "Max"
              : `Boost${
                  nextTapBoostLevel ? `(+${nextTapBoostLevel.cpc})` : ""
                }`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TapBoost;
