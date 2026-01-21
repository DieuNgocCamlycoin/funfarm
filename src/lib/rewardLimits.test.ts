/**
 * ============================================
 * REWARD LIMITS & RATES UNIT TESTS (V3.1)
 * ============================================
 * 
 * Tests to verify V3.1 reward constants are correctly defined.
 * These tests act as documentation and protection against accidental changes.
 * 
 * V3.1 Key Rules:
 * - Separate pools: 50 likes/day + 50 comments/day (NOT combined 50)
 * - Daily cap: 500k CLC (excludes welcome + wallet bonuses)
 * - Quality thresholds: >100 chars for posts, >20 chars for comments
 * 
 * Last updated: 2026-01-21
 * ============================================
 */

import { describe, it, expect } from 'vitest';
import {
  QUALITY_POST_REWARD,
  LIKE_REWARD,
  QUALITY_COMMENT_REWARD,
  SHARE_REWARD,
  FRIENDSHIP_REWARD,
  WELCOME_BONUS,
  WALLET_CONNECT_BONUS,
  DAILY_REWARD_CAP,
  MAX_POSTS_PER_DAY,
  MAX_LIKES_PER_DAY,
  MAX_COMMENTS_PER_DAY,
  MAX_SHARES_PER_DAY,
  MAX_FRIENDSHIPS_PER_DAY
} from './constants';

describe('V3.1 Reward Rates', () => {
  it('QUALITY_POST_REWARD = 10,000 CLC', () => {
    expect(QUALITY_POST_REWARD).toBe(10000);
  });

  it('LIKE_REWARD = 1,000 CLC', () => {
    expect(LIKE_REWARD).toBe(1000);
  });

  it('QUALITY_COMMENT_REWARD = 2,000 CLC', () => {
    expect(QUALITY_COMMENT_REWARD).toBe(2000);
  });

  it('SHARE_REWARD = 10,000 CLC', () => {
    expect(SHARE_REWARD).toBe(10000);
  });

  it('FRIENDSHIP_REWARD = 10,000 CLC', () => {
    expect(FRIENDSHIP_REWARD).toBe(10000);
  });
});

describe('V3.1 One-Time Bonuses', () => {
  it('WELCOME_BONUS = 50,000 CLC', () => {
    expect(WELCOME_BONUS).toBe(50000);
  });

  it('WALLET_CONNECT_BONUS = 50,000 CLC', () => {
    expect(WALLET_CONNECT_BONUS).toBe(50000);
  });

  it('total one-time bonus = 100,000 CLC', () => {
    expect(WELCOME_BONUS + WALLET_CONNECT_BONUS).toBe(100000);
  });
});

describe('V3.1 Daily Limits', () => {
  it('MAX_POSTS_PER_DAY = 10', () => {
    expect(MAX_POSTS_PER_DAY).toBe(10);
  });

  it('MAX_LIKES_PER_DAY = 50 (V3.1: separate pool)', () => {
    expect(MAX_LIKES_PER_DAY).toBe(50);
  });

  it('MAX_COMMENTS_PER_DAY = 50 (V3.1: separate pool)', () => {
    expect(MAX_COMMENTS_PER_DAY).toBe(50);
  });

  it('MAX_SHARES_PER_DAY = 5', () => {
    expect(MAX_SHARES_PER_DAY).toBe(5);
  });

  it('MAX_FRIENDSHIPS_PER_DAY = 10', () => {
    expect(MAX_FRIENDSHIPS_PER_DAY).toBe(10);
  });
});

describe('V3.1 Daily Cap', () => {
  it('DAILY_REWARD_CAP = 500,000 CLC', () => {
    expect(DAILY_REWARD_CAP).toBe(500000);
  });
});

describe('V3.1 Maximum Daily Reward Calculation', () => {
  /**
   * With V3.1 separate pools, max daily reward is:
   * - Posts: 10 × 10k = 100k
   * - Likes: 50 × 1k = 50k
   * - Comments: 50 × 2k = 100k
   * - Shares: 5 × 10k = 50k
   * - Friends: 10 × 10k = 100k
   * - Total raw: 400k (under 500k cap)
   * 
   * Note: This is theoretical maximum; actual depends on activity.
   */
  it('theoretical max (before cap) = 400k', () => {
    const maxPosts = MAX_POSTS_PER_DAY * QUALITY_POST_REWARD;
    const maxLikes = MAX_LIKES_PER_DAY * LIKE_REWARD;
    const maxComments = MAX_COMMENTS_PER_DAY * QUALITY_COMMENT_REWARD;
    const maxShares = MAX_SHARES_PER_DAY * SHARE_REWARD;
    const maxFriends = MAX_FRIENDSHIPS_PER_DAY * FRIENDSHIP_REWARD;
    
    const totalMax = maxPosts + maxLikes + maxComments + maxShares + maxFriends;
    
    expect(totalMax).toBe(400000);
  });

  it('theoretical max is under daily cap (no cap applied)', () => {
    const maxPosts = MAX_POSTS_PER_DAY * QUALITY_POST_REWARD;
    const maxLikes = MAX_LIKES_PER_DAY * LIKE_REWARD;
    const maxComments = MAX_COMMENTS_PER_DAY * QUALITY_COMMENT_REWARD;
    const maxShares = MAX_SHARES_PER_DAY * SHARE_REWARD;
    const maxFriends = MAX_FRIENDSHIPS_PER_DAY * FRIENDSHIP_REWARD;
    
    const totalMax = maxPosts + maxLikes + maxComments + maxShares + maxFriends;
    
    expect(totalMax).toBeLessThanOrEqual(DAILY_REWARD_CAP);
  });

  it('max interaction reward (likes + comments only) = 150k', () => {
    // V3.1 separates likes and comments into independent pools
    const maxLikes = MAX_LIKES_PER_DAY * LIKE_REWARD;     // 50 × 1k = 50k
    const maxComments = MAX_COMMENTS_PER_DAY * QUALITY_COMMENT_REWARD; // 50 × 2k = 100k
    
    expect(maxLikes + maxComments).toBe(150000);
  });
});

describe('V3.1 vs V3.0 Comparison', () => {
  /**
   * V3.0 had combined 50 interactions limit (likes + comments together)
   * V3.1 separates them into independent 50-item pools each
   * 
   * This effectively increases max interaction rewards from 100k to 150k
   */
  it('V3.1 allows more interaction rewards than combined limit would', () => {
    // V3.0 combined: 50 interactions max → worst case 50 × 1k = 50k
    // V3.1 separate: 50 likes + 50 comments → 50k + 100k = 150k
    
    const v30CombinedMax = 50 * Math.max(LIKE_REWARD, QUALITY_COMMENT_REWARD);
    const v31SeparateMax = (MAX_LIKES_PER_DAY * LIKE_REWARD) + 
                           (MAX_COMMENTS_PER_DAY * QUALITY_COMMENT_REWARD);
    
    expect(v31SeparateMax).toBeGreaterThan(v30CombinedMax);
    expect(v31SeparateMax).toBe(150000);
  });
});
