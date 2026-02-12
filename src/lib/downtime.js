function countDowntimeEvents(samples, threshold = 10) {
  let count = 0;
  let consecutiveFails = 0;

  for (const item of samples) {
    if (item.success === 0 || item.success === false) {
      consecutiveFails += 1;
      if (consecutiveFails === threshold) {
        count += 1;
      }
    } else {
      consecutiveFails = 0;
    }
  }

  return count;
}

module.exports = { countDowntimeEvents };
