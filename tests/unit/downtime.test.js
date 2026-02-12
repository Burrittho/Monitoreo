const test = require('node:test');
const assert = require('node:assert/strict');
const { countDowntimeEvents } = require('../../src/lib/downtime');

test('countDowntimeEvents counts one incident on threshold boundary', () => {
  const samples = Array.from({ length: 10 }, () => ({ success: 0 }));
  assert.equal(countDowntimeEvents(samples, 10), 1);
});

test('countDowntimeEvents resets after success', () => {
  const samples = [
    ...Array.from({ length: 10 }, () => ({ success: 0 })),
    { success: 1 },
    ...Array.from({ length: 10 }, () => ({ success: 0 })),
  ];
  assert.equal(countDowntimeEvents(samples, 10), 2);
});
