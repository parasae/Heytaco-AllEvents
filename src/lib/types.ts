export interface UserProfile {
  id: string;
  slackId: string;
  teamId: string;
  name: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  isActive: boolean;
  dailyLimit: number;
  totalReceived: number;
  totalGiven: number;
  redeemable: number;
  createdAt: string;
}

export interface TacoTransaction {
  id: string;
  giverId: string;
  receiverId: string;
  amount: number;
  message: string | null;
  channel: string | null;
  channelName: string | null;
  teamId: string;
  createdAt: string;
  giver: {
    id: string;
    name: string;
    displayName: string;
    avatarUrl: string | null;
  };
  receiver: {
    id: string;
    name: string;
    displayName: string;
    avatarUrl: string | null;
  };
  tags: {
    id: string;
    tag: {
      id: string;
      name: string;
      color: string;
    };
  }[];
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  displayName: string;
  avatarUrl: string | null;
  totalReceived: number;
  totalGiven: number;
  rank: number;
}

export interface RewardItem {
  id: string;
  title: string;
  description: string | null;
  cost: number;
  quantity: number | null;
  imageUrl: string | null;
  type: string;
  isActive: boolean;
  teamId: string;
  createdAt: string;
}

export interface RedemptionItem {
  id: string;
  userId: string;
  rewardId: string;
  status: string;
  teamId: string;
  createdAt: string;
  user: {
    name: string;
    displayName: string;
    avatarUrl: string | null;
  };
  reward: {
    title: string;
    cost: number;
  };
}

export interface TagItem {
  id: string;
  name: string;
  description: string | null;
  color: string;
  teamId: string;
  count?: number;
}

export interface AnalyticsData {
  totalTacos: number;
  totalUsers: number;
  activeUsers: number;
  todayTacos: number;
  weeklyTrend: { date: string; count: number }[];
  topGivers: LeaderboardEntry[];
  topReceivers: LeaderboardEntry[];
  tagDistribution: { name: string; count: number; color: string }[];
}

export interface DailyStats {
  tacosGiven: number;
  tacosRemaining: number;
  dailyLimit: number;
}
