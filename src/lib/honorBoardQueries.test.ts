import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchReactionsReceived,
  fetchCommentsReceived,
  fetchSharesReceived,
} from './honorBoardQueries';

vi.mock('@/integrations/supabase/client');

describe('Honor Board Self-Interaction Exclusion (v3.0 Reward Logic)', () => {
  const mockUserId = 'user-123';
  const mockPostIds = ['post-1', 'post-2'];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchReactionsReceived', () => {
    it('should exclude self-likes using neq filter on user_id', async () => {
      const mockNeq = vi.fn().mockResolvedValue({ count: 10 });
      const mockIn = vi.fn().mockReturnValue({ neq: mockNeq });
      const mockSelect = vi.fn().mockReturnValue({ in: mockIn });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await fetchReactionsReceived({ userId: mockUserId, userPostIds: mockPostIds });

      expect(mockFrom).toHaveBeenCalledWith('post_likes');
      expect(mockSelect).toHaveBeenCalledWith('id', { count: 'exact', head: true });
      expect(mockIn).toHaveBeenCalledWith('post_id', mockPostIds);
      expect(mockNeq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(result).toBe(10);
    });

    it('should return 0 when userPostIds is empty (no posts to check)', async () => {
      const result = await fetchReactionsReceived({ userId: mockUserId, userPostIds: [] });
      expect(result).toBe(0);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should return 0 when count is null', async () => {
      const mockNeq = vi.fn().mockResolvedValue({ count: null });
      const mockIn = vi.fn().mockReturnValue({ neq: mockNeq });
      const mockSelect = vi.fn().mockReturnValue({ in: mockIn });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await fetchReactionsReceived({ userId: mockUserId, userPostIds: mockPostIds });
      expect(result).toBe(0);
    });
  });

  describe('fetchCommentsReceived', () => {
    it('should exclude self-comments using neq filter on author_id', async () => {
      const mockNeq = vi.fn().mockResolvedValue({ count: 5 });
      const mockIn = vi.fn().mockReturnValue({ neq: mockNeq });
      const mockSelect = vi.fn().mockReturnValue({ in: mockIn });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await fetchCommentsReceived({ userId: mockUserId, userPostIds: mockPostIds });

      expect(mockFrom).toHaveBeenCalledWith('comments');
      expect(mockSelect).toHaveBeenCalledWith('id', { count: 'exact', head: true });
      expect(mockIn).toHaveBeenCalledWith('post_id', mockPostIds);
      expect(mockNeq).toHaveBeenCalledWith('author_id', mockUserId);
      expect(result).toBe(5);
    });

    it('should return 0 when userPostIds is empty (no posts to check)', async () => {
      const result = await fetchCommentsReceived({ userId: mockUserId, userPostIds: [] });
      expect(result).toBe(0);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should return 0 when count is null', async () => {
      const mockNeq = vi.fn().mockResolvedValue({ count: null });
      const mockIn = vi.fn().mockReturnValue({ neq: mockNeq });
      const mockSelect = vi.fn().mockReturnValue({ in: mockIn });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await fetchCommentsReceived({ userId: mockUserId, userPostIds: mockPostIds });
      expect(result).toBe(0);
    });
  });

  describe('fetchSharesReceived', () => {
    it('should exclude self-shares using neq filter on user_id', async () => {
      const mockNeq = vi.fn().mockResolvedValue({ count: 3 });
      const mockIn = vi.fn().mockReturnValue({ neq: mockNeq });
      const mockSelect = vi.fn().mockReturnValue({ in: mockIn });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await fetchSharesReceived({ userId: mockUserId, userPostIds: mockPostIds });

      expect(mockFrom).toHaveBeenCalledWith('post_shares');
      expect(mockSelect).toHaveBeenCalledWith('id', { count: 'exact', head: true });
      expect(mockIn).toHaveBeenCalledWith('post_id', mockPostIds);
      expect(mockNeq).toHaveBeenCalledWith('user_id', mockUserId);
      expect(result).toBe(3);
    });

    it('should return 0 when userPostIds is empty (no posts to check)', async () => {
      const result = await fetchSharesReceived({ userId: mockUserId, userPostIds: [] });
      expect(result).toBe(0);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should return 0 when count is null', async () => {
      const mockNeq = vi.fn().mockResolvedValue({ count: null });
      const mockIn = vi.fn().mockReturnValue({ neq: mockNeq });
      const mockSelect = vi.fn().mockReturnValue({ in: mockIn });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await fetchSharesReceived({ userId: mockUserId, userPostIds: mockPostIds });
      expect(result).toBe(0);
    });
  });

  describe('v3.0 Reward Logic Compliance', () => {
    it('should never include interactions where user equals the post owner for all metrics', async () => {
      const mockNeq = vi.fn().mockResolvedValue({ count: 0 });
      const mockIn = vi.fn().mockReturnValue({ neq: mockNeq });
      const mockSelect = vi.fn().mockReturnValue({ in: mockIn });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      await fetchReactionsReceived({ userId: mockUserId, userPostIds: mockPostIds });
      await fetchCommentsReceived({ userId: mockUserId, userPostIds: mockPostIds });
      await fetchSharesReceived({ userId: mockUserId, userPostIds: mockPostIds });

      // Verify neq was called for each query to exclude self-interactions
      expect(mockNeq).toHaveBeenCalledTimes(3);
      
      // Verify correct filter field for each table
      expect(mockNeq).toHaveBeenNthCalledWith(1, 'user_id', mockUserId); // post_likes
      expect(mockNeq).toHaveBeenNthCalledWith(2, 'author_id', mockUserId); // comments
      expect(mockNeq).toHaveBeenNthCalledWith(3, 'user_id', mockUserId); // post_shares
    });

    it('should correctly use different field names for different tables', async () => {
      const neqCalls: Array<[string, string]> = [];
      
      const mockNeq = vi.fn((field: string, value: string) => {
        neqCalls.push([field, value]);
        return Promise.resolve({ count: 0 });
      });
      const mockIn = vi.fn().mockReturnValue({ neq: mockNeq });
      const mockSelect = vi.fn().mockReturnValue({ in: mockIn });
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
      
      vi.mocked(supabase.from).mockImplementation(mockFrom);

      await fetchReactionsReceived({ userId: mockUserId, userPostIds: mockPostIds });
      await fetchCommentsReceived({ userId: mockUserId, userPostIds: mockPostIds });
      await fetchSharesReceived({ userId: mockUserId, userPostIds: mockPostIds });

      // post_likes uses user_id
      expect(neqCalls[0]).toEqual(['user_id', mockUserId]);
      
      // comments uses author_id (different field name!)
      expect(neqCalls[1]).toEqual(['author_id', mockUserId]);
      
      // post_shares uses user_id
      expect(neqCalls[2]).toEqual(['user_id', mockUserId]);
    });
  });
});
