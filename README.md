# TacoTime - Peer Recognition for Slack

A HeyTaco-inspired peer recognition platform built for Slack. Give tacos to celebrate your teammates, track leaderboards, and redeem rewards.

## Features

### Slack Integration (Primary)
- **Taco mentions** - Give tacos by mentioning teammates with taco emojis: `@alice :taco: :taco: Great job!`
- **Taco reactions** - React to any message with :taco: to give 1 taco
- **Slash commands** - `/tacotime` or `/tt` for quick actions
- **DM notifications** - Receivers get a private message with their taco count
- **Welcome messages** - New team members get an onboarding DM automatically
- **Bot mention help** - @mention the bot for a help guide
- **Daily limits** - Configurable per-user daily taco allowance (default: 5)
- **Self-give prevention** - Can't give tacos to yourself
- **Bot filtering** - Can't give tacos to bots

### Slash Commands
| Command | Description |
|---------|-------------|
| `/tacotime help` | Show all available commands |
| `/tacotime give @user Great job!` | Give a taco with a message |
| `/tacotime leaderboard` | View top taco receivers (this month) |
| `/tacotime leaderboard week` | View weekly leaderboard |
| `/tacotime leaderboard all` | View all-time leaderboard |
| `/tacotime my-tacos` | Check your personal stats |
| `/tt` | Shortcut for `/tacotime` |

### Web Dashboard
- Personal dashboard with stats, activity feed, and mini leaderboard
- Full leaderboard with podium, time filters, and search
- Activity timeline with tags and messages
- Taco Shop for redeeming rewards
- Admin panel with analytics, user management, and settings

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Prisma v7** with SQLite (easily swappable to PostgreSQL)
- **@slack/bolt** + **@slack/web-api**
- **Tailwind CSS v4**
- **Radix UI** primitives
- **Recharts** for analytics

## Quick Start

### 1. Clone and Install

```bash
cd heytaco-clone
npm install
```

### 2. Set Up the Database

```bash
npx prisma generate
npx prisma db push
```

### 3. Configure Environment Variables

Copy `.env` and fill in your values:

```env
# Database
DATABASE_URL="file:./dev.db"

# Slack App Configuration (see setup guide below)
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Seed Demo Data (Optional)

Start the dev server and seed:

```bash
npm run dev
# In another terminal:
curl -X POST http://localhost:3000/api/seed
```

### 5. Run the Dev Server

```bash
npm run dev
```

Visit `http://localhost:3000` for the web dashboard.

---

## Slack App Setup Guide

This is the most important part. Follow these steps carefully to connect TacoTime to your Slack workspace.

### Step 1: Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"**
3. Choose **"From a manifest"**
4. Select your workspace
5. Paste the contents of `slack-app-manifest.json` from this repo
6. Replace `https://your-domain.com` with your actual URL (see Step 5 for local dev)
7. Click **"Create"**

### Step 2: Install the App to Your Workspace

1. On the app settings page, go to **"Install App"** in the sidebar
2. Click **"Install to Workspace"**
3. Review the permissions and click **"Allow"**
4. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

### Step 3: Get Your Credentials

You need two values from the Slack app settings:

| Credential | Where to Find It |
|---|---|
| **Bot Token** (`SLACK_BOT_TOKEN`) | Settings > Install App > Bot User OAuth Token |
| **Signing Secret** (`SLACK_SIGNING_SECRET`) | Settings > Basic Information > App Credentials > Signing Secret |

Add these to your `.env` file.

### Step 4: Configure Event Subscriptions

1. Go to **"Event Subscriptions"** in the sidebar
2. Toggle **"Enable Events"** to ON
3. Set the **Request URL** to: `https://your-domain.com/api/slack/events`
4. Slack will send a verification challenge - the app handles this automatically
5. Under **"Subscribe to bot events"**, add these events:
   - `app_mention` - When someone @mentions the bot
   - `message.channels` - Messages in public channels
   - `message.groups` - Messages in private channels
   - `message.im` - Direct messages
   - `message.mpim` - Group DMs
   - `reaction_added` - When someone adds a reaction
   - `team_join` - When a new member joins the workspace

### Step 5: Configure Slash Commands

1. Go to **"Slash Commands"** in the sidebar
2. Create these commands:

| Command | Request URL | Description |
|---------|------------|-------------|
| `/tacotime` | `https://your-domain.com/api/slack/commands` | TacoTime commands |
| `/tt` | `https://your-domain.com/api/slack/commands` | TacoTime shortcut |

Set the **Usage hint** to: `[give @user message | leaderboard | my-tacos | help]`

### Step 6: Set Up for Local Development

For local development, you need a public URL. Use [ngrok](https://ngrok.com/) or [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/):

```bash
# Using ngrok
ngrok http 3000

# Using cloudflared
cloudflared tunnel --url http://localhost:3000
```

Then update the Slack app settings:
- Event Subscriptions Request URL: `https://your-ngrok-url.ngrok.io/api/slack/events`
- Slash Command URLs: `https://your-ngrok-url.ngrok.io/api/slack/commands`

### Step 7: Invite the Bot to Channels

The bot needs to be in a channel to listen for taco messages:

```
/invite @TacoTime
```

Or mention the bot in any channel to get started!

---

## How It Works in Slack

### Giving Tacos

```
# Basic - give 1 taco
@alice :taco: Thanks for the help!

# Multiple tacos (max 5 per message)
@bob :taco: :taco: :taco: Amazing work on the release!

# Multiple recipients
@alice @bob :taco: Great teamwork!

# Via slash command
/tacotime give @alice Great presentation today!

# Via emoji reaction
React to any message with :taco: to give 1 taco
```

### Checking Stats

```
/tacotime my-tacos        # Your personal stats
/tacotime leaderboard     # This month's top receivers
/tacotime lb week         # This week's leaderboard
/tacotime lb all          # All-time leaderboard
```

### What Happens When You Give a Taco

1. The bot validates the request (self-give check, bot check, daily limit)
2. A celebration message is posted in the channel
3. The receiver gets a DM notification with their updated taco count
4. Stats are updated in the database
5. If it's a new user, they get a welcome message first

---

## Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Import the project on [vercel.com](https://vercel.com)
3. Add your environment variables in Vercel's dashboard
4. For production, switch to PostgreSQL:
   - Update `prisma/schema.prisma` datasource to `postgresql`
   - Update `DATABASE_URL` in your env vars
5. Deploy!
6. Update your Slack app URLs to use your Vercel domain

### Deploy to Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Environment Variables for Production

```env
DATABASE_URL=postgresql://user:pass@host:5432/tacotime
SLACK_BOT_TOKEN=xoxb-your-production-token
SLACK_SIGNING_SECRET=your-production-signing-secret
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
```

---

## Project Structure

```
src/
  app/
    api/
      slack/
        events/route.ts     # Slack Events API handler
        commands/route.ts    # Slash command handler
      tacos/route.ts         # Taco CRUD API
      users/route.ts         # User API
      rewards/route.ts       # Rewards API
      redemptions/route.ts   # Redemption API
      analytics/route.ts     # Analytics API
      seed/route.ts          # Demo data seeder
      settings/route.ts      # Team settings API
      tags/route.ts          # Tags API
    (app)/                   # Web dashboard pages
      dashboard/
      leaderboard/
      activity/
      rewards/
      admin/
    page.tsx                 # Landing page
  lib/
    slack.ts                 # Slack bot core logic
    slack-blocks.ts          # Slack Block Kit builders
    prisma.ts                # Database client
    constants.ts             # App configuration
    utils.ts                 # Utility functions
    types.ts                 # TypeScript interfaces
    demo-user.ts             # Demo user helper
  components/
    ui/                      # Reusable UI components
    shared/                  # App-specific components
prisma/
  schema.prisma              # Database schema
slack-app-manifest.json      # Slack app manifest
```

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/slack/events` | POST | Slack Events API webhook |
| `/api/slack/commands` | POST | Slash command handler |
| `/api/tacos` | GET/POST | List/create taco transactions |
| `/api/users` | GET/POST | List/create users |
| `/api/users/[id]` | GET/PATCH | Get/update user |
| `/api/users/[id]/stats` | GET | Detailed user statistics |
| `/api/rewards` | GET/POST | List/create rewards |
| `/api/redemptions` | GET/POST | List/create redemptions |
| `/api/analytics` | GET | Team analytics data |
| `/api/settings` | GET/PUT | Team settings |
| `/api/tags` | GET/POST/DELETE | Tag management |
| `/api/seed` | POST | Seed demo data |

## License

MIT
