import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatLeaderboardTimestamp } from './date.ts';

describe('Leaderboard Timestamp Utilities', () => {
  it('should return empty string for empty input', () => {
    assert.equal(formatLeaderboardTimestamp(''), '');
  });

  it('should format valid timestamp', () => {
    const res = formatLeaderboardTimestamp('2026-08-06T12:00:00Z');
    assert.ok(res);
  });
});
