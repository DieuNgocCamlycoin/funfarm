/**
 * ============================================
 * REWARD VALIDATION UNIT TESTS
 * ============================================
 * 
 * Tests for quality validation functions used in reward calculation.
 * These are PURE FUNCTIONS - no database mocking needed.
 * 
 * Quality Criteria (V3.1):
 * - Quality Post: >100 chars + has media + original content (post/product)
 * - Quality Comment: >20 chars
 * 
 * Last updated: 2026-01-21
 * ============================================
 */

import { describe, it, expect } from 'vitest';
import { 
  hasValidImages, 
  hasValidVideo, 
  isQualityPost, 
  isQualityComment 
} from './rewardCalculationService';

describe('hasValidImages', () => {
  it('returns false for null', () => {
    expect(hasValidImages(null)).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(hasValidImages([])).toBe(false);
  });

  it('returns false for array with empty string', () => {
    expect(hasValidImages([''])).toBe(false);
  });

  it('returns false for array with whitespace only', () => {
    expect(hasValidImages(['   '])).toBe(false);
  });

  it('returns true for array with valid URL', () => {
    expect(hasValidImages(['https://example.com/image.jpg'])).toBe(true);
  });

  it('returns true if at least one valid URL exists', () => {
    expect(hasValidImages(['', 'https://valid.jpg', '  '])).toBe(true);
  });
});

describe('hasValidVideo', () => {
  it('returns false for null', () => {
    expect(hasValidVideo(null)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(hasValidVideo('')).toBe(false);
  });

  it('returns false for whitespace only', () => {
    expect(hasValidVideo('   ')).toBe(false);
  });

  it('returns true for valid URL', () => {
    expect(hasValidVideo('https://example.com/video.mp4')).toBe(true);
  });
});

describe('isQualityPost', () => {
  const createPost = (overrides: Partial<{
    content: string | null;
    images: string[] | null;
    video_url: string | null;
    post_type: string;
  }>) => ({
    content: null,
    images: null,
    video_url: null,
    post_type: 'post',
    ...overrides
  });

  describe('content length requirement (>100 chars)', () => {
    it('rejects post with null content', () => {
      const post = createPost({ 
        content: null, 
        images: ['https://img.jpg'] 
      });
      expect(isQualityPost(post)).toBe(false);
    });

    it('rejects post with 50 chars (too short)', () => {
      const post = createPost({ 
        content: 'A'.repeat(50), 
        images: ['https://img.jpg'] 
      });
      expect(isQualityPost(post)).toBe(false);
    });

    it('rejects post with exactly 100 chars (must be >100)', () => {
      const post = createPost({ 
        content: 'A'.repeat(100), 
        images: ['https://img.jpg'] 
      });
      expect(isQualityPost(post)).toBe(false);
    });

    it('accepts post with 101 chars', () => {
      const post = createPost({ 
        content: 'A'.repeat(101), 
        images: ['https://img.jpg'] 
      });
      expect(isQualityPost(post)).toBe(true);
    });

    it('accepts post with 150 chars', () => {
      const post = createPost({ 
        content: 'A'.repeat(150), 
        images: ['https://img.jpg'] 
      });
      expect(isQualityPost(post)).toBe(true);
    });
  });

  describe('media requirement (images OR video)', () => {
    it('rejects post with content but no media', () => {
      const post = createPost({ 
        content: 'A'.repeat(150), 
        images: null, 
        video_url: null 
      });
      expect(isQualityPost(post)).toBe(false);
    });

    it('rejects post with empty images array', () => {
      const post = createPost({ 
        content: 'A'.repeat(150), 
        images: [] 
      });
      expect(isQualityPost(post)).toBe(false);
    });

    it('accepts post with valid images', () => {
      const post = createPost({ 
        content: 'A'.repeat(150), 
        images: ['https://img.jpg'] 
      });
      expect(isQualityPost(post)).toBe(true);
    });

    it('accepts post with valid video (no images)', () => {
      const post = createPost({ 
        content: 'A'.repeat(150), 
        images: null, 
        video_url: 'https://video.mp4' 
      });
      expect(isQualityPost(post)).toBe(true);
    });

    it('accepts post with both images and video', () => {
      const post = createPost({ 
        content: 'A'.repeat(150), 
        images: ['https://img.jpg'], 
        video_url: 'https://video.mp4' 
      });
      expect(isQualityPost(post)).toBe(true);
    });
  });

  describe('post_type requirement (original content only)', () => {
    it('accepts post_type = "post"', () => {
      const post = createPost({ 
        content: 'A'.repeat(150), 
        images: ['https://img.jpg'],
        post_type: 'post'
      });
      expect(isQualityPost(post)).toBe(true);
    });

    it('accepts post_type = "product"', () => {
      const post = createPost({ 
        content: 'A'.repeat(150), 
        images: ['https://img.jpg'],
        post_type: 'product'
      });
      expect(isQualityPost(post)).toBe(true);
    });

    it('rejects post_type = "share" (not original)', () => {
      const post = createPost({ 
        content: 'A'.repeat(150), 
        images: ['https://img.jpg'],
        post_type: 'share'
      });
      expect(isQualityPost(post)).toBe(false);
    });

    it('rejects post_type = "gift" (not original)', () => {
      const post = createPost({ 
        content: 'A'.repeat(150), 
        images: ['https://img.jpg'],
        post_type: 'gift'
      });
      expect(isQualityPost(post)).toBe(false);
    });
  });

  describe('combined validation', () => {
    it('rejects: short content + images + post type', () => {
      const post = createPost({ 
        content: 'Short content', 
        images: ['https://img.jpg'],
        post_type: 'post'
      });
      expect(isQualityPost(post)).toBe(false);
    });

    it('rejects: long content + no media + post type', () => {
      const post = createPost({ 
        content: 'A'.repeat(150), 
        images: null,
        video_url: null,
        post_type: 'post'
      });
      expect(isQualityPost(post)).toBe(false);
    });

    it('rejects: long content + images + share type', () => {
      const post = createPost({ 
        content: 'A'.repeat(150), 
        images: ['https://img.jpg'],
        post_type: 'share'
      });
      expect(isQualityPost(post)).toBe(false);
    });

    it('accepts: long content + video + product type', () => {
      const post = createPost({ 
        content: 'A'.repeat(150), 
        images: null,
        video_url: 'https://video.mp4',
        post_type: 'product'
      });
      expect(isQualityPost(post)).toBe(true);
    });
  });
});

describe('isQualityComment', () => {
  it('returns false for null', () => {
    expect(isQualityComment(null)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isQualityComment('')).toBe(false);
  });

  it('returns false for 10 chars', () => {
    expect(isQualityComment('A'.repeat(10))).toBe(false);
  });

  it('returns false for exactly 20 chars (must be >20)', () => {
    expect(isQualityComment('A'.repeat(20))).toBe(false);
  });

  it('returns true for 21 chars', () => {
    expect(isQualityComment('A'.repeat(21))).toBe(true);
  });

  it('returns true for 100 chars', () => {
    expect(isQualityComment('A'.repeat(100))).toBe(true);
  });
});
