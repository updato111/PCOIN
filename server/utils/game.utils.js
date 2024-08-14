const calculateCurrentHp = (
  currentHp,
  lastKnownHpTime,
  maxHp,
  requiredClickHp
) => {
  // if (currentHp < requiredClickHp) {
  const now = new Date(new Date().toISOString());
  const lastTime = new Date(lastKnownHpTime);
  const secondsElapsed = (now.getTime() - lastTime.getTime()) / 1000;
  const regeneratedHp = Math.floor(secondsElapsed / 2) * 1;
  return Math.min(Math.floor(currentHp + regeneratedHp), maxHp);
  // } else {
  //   return currentHp;
  // }
};

export { calculateCurrentHp };
