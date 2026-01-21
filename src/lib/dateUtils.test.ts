/**
 * ============================================
 * DATE UTILS UNIT TESTS
 * ============================================
 * 
 * Tests for Vietnam timezone conversion functions.
 * Ensures reward calculations use correct Vietnam Day (UTC+7).
 * 
 * CRITICAL: These tests protect against timezone bugs that
 * cause reward discrepancies between 17:00-24:00 UTC.
 * 
 * Last updated: 2026-01-21
 * ============================================
 */

import { describe, it, expect } from 'vitest';
import { toVietnamDate, groupByVietnamDate, applyDailyLimit, applyDailyCap } from './dateUtils';

describe('toVietnamDate', () => {
  describe('morning UTC (00:00-16:59 UTC) → same day Vietnam', () => {
    it('00:00 UTC → same day VN (07:00 VN)', () => {
      const result = toVietnamDate('2026-01-15T00:00:00Z');
      expect(result).toBe('2026-01-15');
    });

    it('10:00 UTC → same day VN (17:00 VN)', () => {
      const result = toVietnamDate('2026-01-15T10:00:00Z');
      expect(result).toBe('2026-01-15');
    });

    it('16:59:59 UTC → same day VN (23:59:59 VN)', () => {
      const result = toVietnamDate('2026-01-15T16:59:59Z');
      expect(result).toBe('2026-01-15');
    });
  });

  describe('evening UTC (17:00-23:59 UTC) → next day Vietnam', () => {
    it('17:00:00 UTC → next day VN (00:00:00 VN) - CRITICAL EDGE CASE', () => {
      const result = toVietnamDate('2026-01-15T17:00:00Z');
      expect(result).toBe('2026-01-16');
    });

    it('19:00 UTC → next day VN (02:00 VN)', () => {
      const result = toVietnamDate('2026-01-15T19:00:00Z');
      expect(result).toBe('2026-01-16');
    });

    it('23:59:59 UTC → next day VN (06:59:59 VN)', () => {
      const result = toVietnamDate('2026-01-15T23:59:59Z');
      expect(result).toBe('2026-01-16');
    });
  });

  describe('year boundary', () => {
    it('2025-12-31 23:00 UTC → 2026-01-01 VN', () => {
      const result = toVietnamDate('2025-12-31T23:00:00Z');
      expect(result).toBe('2026-01-01');
    });

    it('2026-01-01 00:00 UTC → 2026-01-01 VN', () => {
      const result = toVietnamDate('2026-01-01T00:00:00Z');
      expect(result).toBe('2026-01-01');
    });
  });
});

describe('groupByVietnamDate', () => {
  interface TestItem {
    id: string;
    created_at: string;
  }

  it('groups items from same Vietnam day together', () => {
    const items: TestItem[] = [
      { id: '1', created_at: '2026-01-15T08:00:00Z' }, // 15:00 VN → Jan 15
      { id: '2', created_at: '2026-01-15T10:00:00Z' }, // 17:00 VN → Jan 15
      { id: '3', created_at: '2026-01-15T16:00:00Z' }, // 23:00 VN → Jan 15
    ];

    const grouped = groupByVietnamDate(items, item => item.created_at);

    expect(grouped.size).toBe(1);
    expect(grouped.get('2026-01-15')?.length).toBe(3);
  });

  it('groups items from different Vietnam days separately', () => {
    const items: TestItem[] = [
      { id: '1', created_at: '2026-01-15T10:00:00Z' }, // 17:00 VN → Jan 15
      { id: '2', created_at: '2026-01-15T18:00:00Z' }, // 01:00 VN → Jan 16
      { id: '3', created_at: '2026-01-16T10:00:00Z' }, // 17:00 VN → Jan 16
    ];

    const grouped = groupByVietnamDate(items, item => item.created_at);

    expect(grouped.size).toBe(2);
    expect(grouped.get('2026-01-15')?.length).toBe(1);
    expect(grouped.get('2026-01-16')?.length).toBe(2);
  });

  it('handles empty array', () => {
    const grouped = groupByVietnamDate([], (item: TestItem) => item.created_at);
    expect(grouped.size).toBe(0);
  });
});

describe('applyDailyLimit', () => {
  interface TestItem {
    id: string;
    created_at: string;
  }

  it('applies limit per Vietnam day', () => {
    const items: TestItem[] = [
      // Jan 15 VN - 5 items
      { id: '1', created_at: '2026-01-15T08:00:00Z' },
      { id: '2', created_at: '2026-01-15T09:00:00Z' },
      { id: '3', created_at: '2026-01-15T10:00:00Z' },
      { id: '4', created_at: '2026-01-15T11:00:00Z' },
      { id: '5', created_at: '2026-01-15T12:00:00Z' },
    ];

    const result = applyDailyLimit(items, item => item.created_at, 3);

    expect(result.length).toBe(3);
    expect(result.map(r => r.id)).toEqual(['1', '2', '3']);
  });

  it('allows full limit for each day separately', () => {
    const items: TestItem[] = [
      // Jan 15 VN - 3 items
      { id: '1', created_at: '2026-01-15T08:00:00Z' },
      { id: '2', created_at: '2026-01-15T09:00:00Z' },
      { id: '3', created_at: '2026-01-15T10:00:00Z' },
      // Jan 16 VN - 3 items (17:00 UTC Jan 15 = 00:00 VN Jan 16)
      { id: '4', created_at: '2026-01-15T17:00:00Z' },
      { id: '5', created_at: '2026-01-15T18:00:00Z' },
      { id: '6', created_at: '2026-01-15T19:00:00Z' },
    ];

    const result = applyDailyLimit(items, item => item.created_at, 2);

    expect(result.length).toBe(4); // 2 from Jan 15, 2 from Jan 16
    expect(result.map(r => r.id)).toEqual(['1', '2', '4', '5']);
  });

  it('returns all items when under limit', () => {
    const items: TestItem[] = [
      { id: '1', created_at: '2026-01-15T08:00:00Z' },
      { id: '2', created_at: '2026-01-15T09:00:00Z' },
    ];

    const result = applyDailyLimit(items, item => item.created_at, 50);

    expect(result.length).toBe(2);
  });
});

describe('applyDailyCap', () => {
  it('caps single day rewards to 500k', () => {
    const rewardsByDate = new Map([
      ['2026-01-15', 600000],
    ]);

    const total = applyDailyCap(rewardsByDate, 500000);

    expect(total).toBe(500000);
  });

  it('caps each day independently', () => {
    const rewardsByDate = new Map([
      ['2026-01-15', 600000], // → 500k
      ['2026-01-16', 400000], // → 400k (under cap)
    ]);

    const total = applyDailyCap(rewardsByDate, 500000);

    expect(total).toBe(900000); // 500k + 400k
  });

  it('allows full rewards when under cap', () => {
    const rewardsByDate = new Map([
      ['2026-01-15', 300000],
      ['2026-01-16', 200000],
    ]);

    const total = applyDailyCap(rewardsByDate, 500000);

    expect(total).toBe(500000); // Full amount
  });

  it('handles empty map', () => {
    const rewardsByDate = new Map<string, number>();

    const total = applyDailyCap(rewardsByDate, 500000);

    expect(total).toBe(0);
  });

  it('uses custom cap when provided', () => {
    const rewardsByDate = new Map([
      ['2026-01-15', 300000],
    ]);

    const total = applyDailyCap(rewardsByDate, 200000);

    expect(total).toBe(200000);
  });
});
