import { supabase } from '@/integrations/supabase/client';

export interface HonorBoardQueryParams {
  userId: string;
  userPostIds: string[];
}

/**
 * Fetch reactions received on user's posts, excluding self-likes
 * per v3.0 reward logic (self-interactions don't count for rewards)
 */
export async function fetchReactionsReceived({ userId, userPostIds }: HonorBoardQueryParams): Promise<number> {
  if (userPostIds.length === 0) return 0;
  
  const { count } = await supabase
    .from('post_likes')
    .select('id', { count: 'exact', head: true })
    .in('post_id', userPostIds)
    .neq('user_id', userId); // Exclude self-likes
  
  return count || 0;
}

/**
 * Fetch comments received on user's posts, excluding self-comments
 * per v3.0 reward logic (self-interactions don't count for rewards)
 */
export async function fetchCommentsReceived({ userId, userPostIds }: HonorBoardQueryParams): Promise<number> {
  if (userPostIds.length === 0) return 0;
  
  const { count } = await supabase
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .in('post_id', userPostIds)
    .neq('author_id', userId); // Exclude self-comments
  
  return count || 0;
}

/**
 * Fetch shares received on user's posts, excluding self-shares
 * per v3.0 reward logic (self-interactions don't count for rewards)
 */
export async function fetchSharesReceived({ userId, userPostIds }: HonorBoardQueryParams): Promise<number> {
  if (userPostIds.length === 0) return 0;
  
  const { count } = await supabase
    .from('post_shares')
    .select('id', { count: 'exact', head: true })
    .in('post_id', userPostIds)
    .neq('user_id', userId); // Exclude self-shares
  
  return count || 0;
}
