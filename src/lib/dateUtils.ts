/**
 * Vietnam Timezone Utilities for Reward Calculation
 * 
 * FUN FARM uses Vietnam Day (UTC+7) as the baseline for all reward calculations.
 * This ensures consistency between UI and backend.
 * 
 * CRITICAL: All reward-related code MUST use these helpers instead of .split('T')[0]
 * to avoid timezone discrepancies between 17:00-24:00 UTC.
 */

/**
 * Convert UTC timestamp to Vietnam date string (YYYY-MM-DD)
 * 
 * CRITICAL: Must not use date-fns/format() as it applies browser timezone
 * Instead, manually extract UTC components after adding 7 hours
 * 
 * @example
 * // Activity at 2025-01-19T19:00:00Z (02:00 AM Vietnam time on Jan 20)
 * toVietnamDate('2025-01-19T19:00:00Z') // Returns '2025-01-20'
 * 
 * // Using .split('T')[0] would incorrectly return '2025-01-19'
 */
export const toVietnamDate = (utcTimestamp: string): string => {
  const date = new Date(utcTimestamp);
  // Add 7 hours to convert UTC to Vietnam time (UTC+7)
  const vnMs = date.getTime() + 7 * 60 * 60 * 1000;
  const vnDate = new Date(vnMs);
  // Use UTC getters to avoid browser timezone interference
  const year = vnDate.getUTCFullYear();
  const month = String(vnDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(vnDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Group items by Vietnam date
 * 
 * @param items - Array of items to group
 * @param getTimestamp - Function to extract UTC timestamp from item
 * @returns Map of Vietnam date string to items
 */
export const groupByVietnamDate = <T>(
  items: T[], 
  getTimestamp: (item: T) => string
): Map<string, T[]> => {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const vnDate = toVietnamDate(getTimestamp(item));
    if (!grouped.has(vnDate)) {
      grouped.set(vnDate, []);
    }
    grouped.get(vnDate)!.push(item);
  }
  return grouped;
};

/**
 * Apply daily limit using Vietnam date grouping
 * 
 * @param items - Array of items (must be sorted by created_at ascending)
 * @param getTimestamp - Function to extract UTC timestamp from item
 * @param limit - Maximum items per Vietnam day
 * @returns Filtered array with daily limit applied
 */
export const applyDailyLimit = <T>(
  items: T[], 
  getTimestamp: (item: T) => string, 
  limit: number
): T[] => {
  const grouped = groupByVietnamDate(items, getTimestamp);
  const result: T[] = [];
  for (const [, dayItems] of grouped) {
    result.push(...dayItems.slice(0, limit));
  }
  return result;
};

/**
 * Apply daily cap (500k) per Vietnam day
 * 
 * @param rewardsByDate - Map of Vietnam date to reward amount
 * @param cap - Maximum reward per day (default 500,000 CLC)
 * @returns Total reward after applying daily cap
 */
export const applyDailyCap = (
  rewardsByDate: Map<string, number>,
  cap: number = 500000
): number => {
  let total = 0;
  for (const [, amount] of rewardsByDate) {
    total += Math.min(amount, cap);
  }
  return total;
};

/**
 * Format UTC timestamp to user's local timezone with exact date and time
 * UI display only - does NOT affect reward calculations
 * 
 * Browser's Date object automatically converts UTC to local timezone
 * 
 * @example
 * // User in GMT+8 viewing post created at 2026-01-21T03:50:00Z
 * formatLocalDateTime('2026-01-21T03:50:00Z') // Returns "11h50 ngày 21/01/2026"
 * 
 * // User in GMT+7 viewing the same post
 * formatLocalDateTime('2026-01-21T03:50:00Z') // Returns "10h50 ngày 21/01/2026"
 */
export const formatLocalDateTime = (utcTimestamp: string): string => {
  const date = new Date(utcTimestamp);
  
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${hours}h${minutes} ngày ${day}/${month}/${year}`;
};
