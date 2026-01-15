// 🌱 Divine Mantra: "Free-Fee & Earn - FUN FARM Web3"
// Reward System v3.0

// CAMLY Token Contract Address
export const CAMLY_CONTRACT = '0x0910320181889feFDE0BB1Ca63962b0A8882e413';

// ============================================
// ONE-TIME REWARDS (Không tính vào Daily Cap)
// ============================================

// Welcome bonus amount (đăng ký hoàn tất + Luật Ánh Sáng)
export const WELCOME_BONUS = 50000;

// Wallet connection bonus (kết nối ví lần đầu)
export const WALLET_CONNECT_BONUS = 50000;

// Total welcome package
export const TOTAL_WELCOME_BONUS = WELCOME_BONUS + WALLET_CONNECT_BONUS; // 100,000 CAMLY

// Light Law upgrade bonus for existing users
export const LIGHT_LAW_UPGRADE_BONUS = 50000;

// ============================================
// DAILY REWARDS (Tính vào Daily Cap 500,000 CLC)
// ============================================

// Daily Cap - Giới hạn thưởng tối đa mỗi ngày (không bao gồm Welcome + Wallet)
export const DAILY_REWARD_CAP = 500000;

// Post rewards
export const QUALITY_POST_REWARD = 10000; // Bài CL: >100 ký tự + media

// Like rewards
export const LIKE_REWARD = 1000; // Flat 1k/like

// Comment rewards
export const QUALITY_COMMENT_REWARD = 2000; // Comment CL: >20 ký tự

// Share rewards
export const SHARE_REWARD = 10000; // Người đăng bài gốc nhận

// Friendship rewards
export const FRIENDSHIP_REWARD = 10000; // Mỗi người nhận 10k

// Livestream rewards
export const LIVESTREAM_REWARD = 20000; // Livestream ≥15 phút
export const LIVESTREAM_MIN_DURATION = 15; // Phút

// ============================================
// DAILY LIMITS
// ============================================

export const MAX_POSTS_PER_DAY = 10;
export const MAX_INTERACTIONS_PER_DAY = 50; // Like + Comment
export const MAX_SHARES_PER_DAY = 5;
export const MAX_FRIENDSHIPS_PER_DAY = 10;
export const MAX_LIVESTREAMS_PER_DAY = 5;
