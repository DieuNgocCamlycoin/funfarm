import { supabase } from '@/integrations/supabase/client';

export interface HonorBoardQueryParams {
  userId: string;
  userPostIds: string[];
  validUserIds?: string[]; // Only count interactions from these users (excludes banned/deleted)
}

/**
 * Get list of valid user IDs (active, not banned, not deleted)
 * This is used to filter out interactions from invalid users
 */
export async function getValidUserIds(): Promise<string[]> {
  // Lấy active profiles (không bị ban)
  const { data: activeProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('banned', false);
  
  // Lấy deleted users
  const { data: deletedUsers } = await supabase
    .from('deleted_users')
    .select('user_id');
  
  const deletedUserIds = new Set(deletedUsers?.map(d => d.user_id) || []);
  
  // Valid = active AND không trong deleted_users
  return activeProfiles
    ?.filter(p => !deletedUserIds.has(p.id))
    .map(p => p.id) || [];
}

/**
 * Fetch reactions received on user's posts, excluding self-likes
 * and optionally filtering by valid user IDs (excludes banned/deleted users)
 * per v3.0 reward logic (self-interactions don't count for rewards)
 */
export async function fetchReactionsReceived({ userId, userPostIds, validUserIds }: HonorBoardQueryParams): Promise<number> {
  if (userPostIds.length === 0) return 0;
  
  let query = supabase
    .from('post_likes')
    .select('id', { count: 'exact', head: true })
    .in('post_id', userPostIds)
    .neq('user_id', userId); // Exclude self-likes
  
  // Filter by valid users if provided
  if (validUserIds && validUserIds.length > 0) {
    query = query.in('user_id', validUserIds);
  }
  
  const { count } = await query;
  return count || 0;
}

/**
 * Fetch comments received on user's posts, excluding self-comments
 * and optionally filtering by valid user IDs (excludes banned/deleted users)
 * per v3.0 reward logic (self-interactions don't count for rewards)
 */
export async function fetchCommentsReceived({ userId, userPostIds, validUserIds }: HonorBoardQueryParams): Promise<number> {
  if (userPostIds.length === 0) return 0;
  
  let query = supabase
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .in('post_id', userPostIds)
    .neq('author_id', userId); // Exclude self-comments
  
  // Filter by valid users if provided
  if (validUserIds && validUserIds.length > 0) {
    query = query.in('author_id', validUserIds);
  }
  
  const { count } = await query;
  return count || 0;
}

/**
 * Fetch shares received on user's posts, excluding self-shares
 * and optionally filtering by valid user IDs (excludes banned/deleted users)
 * per v3.0 reward logic (self-interactions don't count for rewards)
 */
export async function fetchSharesReceived({ userId, userPostIds, validUserIds }: HonorBoardQueryParams): Promise<number> {
  if (userPostIds.length === 0) return 0;
  
  let query = supabase
    .from('post_shares')
    .select('id', { count: 'exact', head: true })
    .in('post_id', userPostIds)
    .neq('user_id', userId); // Exclude self-shares
  
  // Filter by valid users if provided
  if (validUserIds && validUserIds.length > 0) {
    query = query.in('user_id', validUserIds);
  }
  
  const { count } = await query;
  return count || 0;
}
