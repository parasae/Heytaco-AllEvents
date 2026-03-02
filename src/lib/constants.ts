export const DEFAULT_DAILY_LIMIT = 5;
export const MAX_TACOS_PER_MESSAGE = 5;
export const TACO_EMOJI = "🌮";
export const TACO_SLACK_EMOJI = ":taco:";

export const APP_NAME = "TacoTime";
export const APP_DESCRIPTION = "Celebrate your team with tacos! 🌮";
export const APP_TAGLINE = "Give tacos, spread joy, build culture.";

export const DEMO_TEAM_ID = "demo-team";

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Leaderboard", href: "/leaderboard", icon: "Trophy" },
  { label: "Activity", href: "/activity", icon: "Activity" },
  { label: "Taco Shop", href: "/rewards", icon: "ShoppingBag" },
] as const;

export const ADMIN_NAV_ITEMS = [
  { label: "Overview", href: "/admin", icon: "BarChart3" },
  { label: "Users", href: "/admin/users", icon: "Users" },
  { label: "Rewards", href: "/admin/rewards", icon: "Gift" },
  { label: "Settings", href: "/admin/settings", icon: "Settings" },
] as const;

export const DEFAULT_TAGS = [
  { name: "teamwork", description: "Great collaboration and teamwork", color: "#3B82F6" },
  { name: "innovation", description: "Creative and innovative thinking", color: "#8B5CF6" },
  { name: "helpfulness", description: "Going above and beyond to help others", color: "#10B981" },
  { name: "leadership", description: "Showing strong leadership qualities", color: "#F59E0B" },
  { name: "dedication", description: "Outstanding dedication and hard work", color: "#EF4444" },
  { name: "mentorship", description: "Mentoring and developing others", color: "#EC4899" },
];
