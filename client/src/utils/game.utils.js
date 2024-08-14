function numberWithCommas(x) {
  return x?.toString()?.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function percentage(partialValue, totalValue) {
  let result = (100 * partialValue) / totalValue;

  if (isNaN(result)) {
    result = 0;
  }

  return result;
}

function calculateCoinsEarned(current_hp, totalNumberClicked) {
  let realCoinsEarned = current_hp - totalNumberClicked * 1;

  if (realCoinsEarned < 0) {
    realCoinsEarned = current_hp;
  } else {
    realCoinsEarned = totalNumberClicked * 1;
  }
}

export { numberWithCommas, percentage, calculateCoinsEarned };
