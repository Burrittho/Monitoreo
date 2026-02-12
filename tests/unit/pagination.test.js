const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizePagination } = require('../../src/lib/pagination');

test('sanitizePagination applies defaults', () => {
  assert.deepEqual(sanitizePagination({}), { limit: 100, offset: 0 });
});

test('sanitizePagination enforces bounds', () => {
  assert.deepEqual(sanitizePagination({ limit: '9999', offset: '-1' }), { limit: 500, offset: 0 });
});
