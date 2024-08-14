import { useState } from "react";
import { v4 as uuidv4 } from "uuid";

const CoinClicker = ({ onclickHandle, userAuthData }) => {
  const [coins, setCoins] = useState([]);

  const handleTouchStart = (event) => {
    const touches = event.touches;

    if (touches.length > 4) {
      return;
    }

    const canClick = onclickHandle(touches.length);

    if (!canClick) {
      return;
    }

    for (let index = 0; index < touches.length; index++) {
      const { clientX: clickX, clientY: clickY } = touches[index];

      const newCoin = {
        id: uuidv4(),
        x: clickX - 20,
        y: clickY,
      };

      setCoins((prevCoins) => [...prevCoins, newCoin]);

      setTimeout(() => {
        setCoins((prevCoins) =>
          prevCoins.map((coin) =>
            coin.id === newCoin.id ? { ...coin, animate: true } : coin
          )
        );
      }, 10);

      setTimeout(() => {
        setCoins((prevCoins) =>
          prevCoins.filter((coin) => coin.id !== newCoin.id)
        );
      }, 1000);
    }
  };

  return (
    <button
      className="z-10 click-area cursor-pointer rounded-full overflow-hidden"
      // onClick={handleClick}
      onTouchStart={handleTouchStart}
    >
      {coins.map((coin) => (
        <div
          key={coin.id}
          className={`coin font-bold text-4xl ${coin.animate ? "animate" : ""}`}
          style={{ position: "absolute", left: coin.x, top: coin.y }}
        >
          +{userAuthData?.coinPerClick}
        </div>
      ))}
      {/* <div className={`coin`} style={{ right: 128, bottom: 206 }} /> */}
      <img src="/pcoin.png" className="w-[230px] h-[230px]" alt="" />
    </button>
  );
};

export default CoinClicker;
