/**
 * ============================================
 * REWARD CALCULATION INTEGRATION TESTS
 * ============================================
 * 
 * Tests for integrated reward calculation logic.
 * Uses mock data to test daily limits and cap application.
 * 
 * These tests verify:
 * - Daily limit application (FCFS)
 * - Daily cap enforcement (500k)
 * - Bonus exclusion from cap
 * 
 * Last updated: 2026-01-21
 * ============================================
 */

import { describe, it, expect } from 'vitest';
import { 
  toVietnamDate, 
  groupByVietnamDate, 
  applyDailyLimit, 
  applyDailyCap 
} from './dateUtils';
import {
  QUALITY_POST_REWARD,
  LIKE_REWARD,
  QUALITY_COMMENT_REWARD,
  DAILY_REWARD_CAP,
  MAX_POSTS_PER_DAY,
  MAX_LIKES_PER_DAY,
  MAX_COMMENTS_PER_DAY,
  WELCOME_BONUS,
  WALLET_CONNECT_BONUS
} from './constants';

// Mock post interface
interface MockPost {
  id: string;
  created_at: string;
}

// Mock interaction interface
interface MockInteraction {
  id: string;
  created_at: string;
  post_id: string;
}

describe('Post Reward Calculation', () => {
  it('rewards first 10 quality posts per day', () => {
    // Create 15 posts on same Vietnam day
    const posts: MockPost[] = Array.from({ length: 15 }, (_, i) => ({
      id: `post-${i}`,
      created_at: `2026-01-15T0${Math.floor(i % 10)}:00:00Z` // All on Jan 15 VN
    }));

    const limitedPosts = applyDailyLimit(posts, p => p.created_at, MAX_POSTS_PER_DAY);
    const postReward = limitedPosts.length * QUALITY_POST_REWARD;

    expect(limitedPosts.length).toBe(10);
    expect(postReward).toBe(100000); // 10 × 10k
  });

  it('resets limit on new Vietnam day', () => {
    const posts: MockPost[] = [
      // 5 posts on Jan 15 VN
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `jan15-${i}`,
        created_at: `2026-01-15T0${i}:00:00Z`
      })),
      // 5 posts on Jan 16 VN (after 17:00 UTC on Jan 15)
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `jan16-${i}`,
        created_at: `2026-01-15T${17 + i}:00:00Z`
      }))
    ];

    const limitedPosts = applyDailyLimit(posts, p => p.created_at, MAX_POSTS_PER_DAY);

    expect(limitedPosts.length).toBe(10); // 5 from each day
  });
});

describe('Like Reward Calculation (V3.1 Separate Pool)', () => {
  it('limits to 50 likes per day', () => {
    // Create 60 likes on same Vietnam day
    const likes: MockInteraction[] = Array.from({ length: 60 }, (_, i) => ({
      id: `like-${i}`,
      created_at: '2026-01-15T10:00:00Z',
      post_id: `post-${i}`
    }));

    const limitedLikes = applyDailyLimit(likes, l => l.created_at, MAX_LIKES_PER_DAY);
    const likeReward = limitedLikes.length * LIKE_REWARD;

    expect(limitedLikes.length).toBe(50);
    expect(likeReward).toBe(50000); // 50 × 1k
  });

  it('V3.1: likes have independent pool from comments', () => {
    // 60 likes and 60 comments should each be limited independently
    const likes: MockInteraction[] = Array.from({ length: 60 }, (_, i) => ({
      id: `like-${i}`,
      created_at: '2026-01-15T10:00:00Z',
      post_id: `post-${i}`
    }));

    const comments: MockInteraction[] = Array.from({ length: 60 }, (_, i) => ({
      id: `comment-${i}`,
      created_at: '2026-01-15T10:00:00Z',
      post_id: `post-${i}`
    }));

    const limitedLikes = applyDailyLimit(likes, l => l.created_at, MAX_LIKES_PER_DAY);
    const limitedComments = applyDailyLimit(comments, c => c.created_at, MAX_COMMENTS_PER_DAY);

    // V3.1: Both can hit their full 50-item limit independently
    expect(limitedLikes.length).toBe(50);
    expect(limitedComments.length).toBe(50);
    
    // Total interactions = 100 (50 + 50), not 50 combined
    expect(limitedLikes.length + limitedComments.length).toBe(100);
  });
});

describe('Comment Reward Calculation (V3.1 Separate Pool)', () => {
  it('limits to 50 quality comments per day', () => {
    const comments: MockInteraction[] = Array.from({ length: 60 }, (_, i) => ({
      id: `comment-${i}`,
      created_at: '2026-01-15T10:00:00Z',
      post_id: `post-${i}`
    }));

    const limitedComments = applyDailyLimit(comments, c => c.created_at, MAX_COMMENTS_PER_DAY);
    const commentReward = limitedComments.length * QUALITY_COMMENT_REWARD;

    expect(limitedComments.length).toBe(50);
    expect(commentReward).toBe(100000); // 50 × 2k
  });
});

describe('Daily Cap Application', () => {
  it('caps rewards at 500k per day', () => {
    const rewardsByDate = new Map([
      ['2026-01-15', 600000]
    ]);

    const totalAfterCap = applyDailyCap(rewardsByDate, DAILY_REWARD_CAP);

    expect(totalAfterCap).toBe(500000);
  });

  it('applies cap per day independently', () => {
    const rewardsByDate = new Map([
      ['2026-01-15', 600000], // → capped to 500k
      ['2026-01-16', 300000]  // → full 300k
    ]);

    const totalAfterCap = applyDailyCap(rewardsByDate, DAILY_REWARD_CAP);

    expect(totalAfterCap).toBe(800000); // 500k + 300k
  });

  it('does not cap rewards under 500k', () => {
    const rewardsByDate = new Map([
      ['2026-01-15', 400000]
    ]);

    const totalAfterCap = applyDailyCap(rewardsByDate, DAILY_REWARD_CAP);

    expect(totalAfterCap).toBe(400000);
  });
});

describe('Bonus Exclusion from Daily Cap', () => {
  /**
   * Welcome (50k) + Wallet (50k) bonuses are NOT included in daily cap.
   * They are one-time rewards added on top of capped daily rewards.
   */
  it('bonuses are added on top of capped daily rewards', () => {
    // Daily rewards hit cap
    const rewardsByDate = new Map([
      ['2026-01-15', 600000]
    ]);
    const cappedDailyRewards = applyDailyCap(rewardsByDate, DAILY_REWARD_CAP);

    // Bonuses are separate
    const welcomeBonus = WELCOME_BONUS;
    const walletBonus = WALLET_CONNECT_BONUS;

    // Total = capped daily + bonuses
    const totalReward = cappedDailyRewards + welcomeBonus + walletBonus;

    expect(cappedDailyRewards).toBe(500000);
    expect(totalReward).toBe(600000); // 500k + 50k + 50k
  });

  it('full reward breakdown example', () => {
    // Scenario: User maxes out everything on day 1
    const day1Posts = MAX_POSTS_PER_DAY * QUALITY_POST_REWARD;        // 100k
    const day1Likes = MAX_LIKES_PER_DAY * LIKE_REWARD;                // 50k
    const day1Comments = MAX_COMMENTS_PER_DAY * QUALITY_COMMENT_REWARD; // 100k
    const day1Total = day1Posts + day1Likes + day1Comments;           // 250k

    const rewardsByDate = new Map([
      ['2026-01-15', day1Total]
    ]);

    const cappedDaily = applyDailyCap(rewardsByDate, DAILY_REWARD_CAP);
    
    // 250k is under cap, so no capping applied
    expect(cappedDaily).toBe(250000);

    // Add bonuses
    const totalWithBonuses = cappedDaily + WELCOME_BONUS + WALLET_CONNECT_BONUS;
    expect(totalWithBonuses).toBe(350000); // 250k + 100k bonuses
  });
});

describe('Edge Cases', () => {
  it('handles zero rewards gracefully', () => {
    const rewardsByDate = new Map<string, number>();
    const total = applyDailyCap(rewardsByDate, DAILY_REWARD_CAP);
    expect(total).toBe(0);
  });

  it('handles exactly 500k reward (no capping needed)', () => {
    const rewardsByDate = new Map([
      ['2026-01-15', 500000]
    ]);
    const total = applyDailyCap(rewardsByDate, DAILY_REWARD_CAP);
    expect(total).toBe(500000);
  });

  it('handles multiple days with mixed cap application', () => {
    const rewardsByDate = new Map([
      ['2026-01-15', 700000], // → 500k
      ['2026-01-16', 500000], // → 500k (exactly cap)
      ['2026-01-17', 200000], // → 200k (under cap)
    ]);
    
    const total = applyDailyCap(rewardsByDate, DAILY_REWARD_CAP);
    expect(total).toBe(1200000); // 500k + 500k + 200k
  });
});
