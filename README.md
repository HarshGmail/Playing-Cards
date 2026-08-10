# Playing Cards — Score Tracker

A modern, real-time score tracking app for card games. Built with Next.js 15, TypeScript, MongoDB, and Tailwind CSS.

**Game rules:** [docs/LEAST_COUNT.md](docs/LEAST_COUNT.md) — the house variant this app was built to track.

## 🎯 Status: Production-Ready MVP Complete

**Build Status:** ✅ Passing  
**TypeScript Check:** ✅ No errors (strict mode)  
**All Endpoints:** ✅ 25+ API routes implemented  
**All UI:** ✅ 20+ components ready  
**Test Coverage:** ✅ Domain ranking fully tested

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas or local MongoDB instance
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Configure MongoDB connection in .env.local
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/playing-cards

# Start development server
npm run dev

# Open http://localhost:3000
```

### Build for Production

```bash
npm run build
npm run start
```

### Behind a corporate VPN / TLS-intercepting proxy

If the app starts fine but every database-backed request fails with:

```text
MongoServerSelectionError: self-signed certificate in certificate chain
```

…that is **not** a network problem and **not** an Atlas IP access-list problem
(adding `0.0.0.0/0` will not fix it). The TCP connection reaches Atlas fine.

A corporate proxy is intercepting the TLS handshake and re-signing Atlas's
certificate with an internal root CA. Your OS trusts that CA, but **Node ships
its own bundled CA list and ignores the system trust store**, so the MongoDB
driver rejects the chain.

**There is nothing to configure** — `npm run dev`, `npm run build`, and
`npm run start` handle it. But it is worth knowing why the fix has the shape it
does, because the obvious places to put it do not work.

Node can trust the OS certificate store, but only when started with
`--use-system-ca`. That flag is **opt-in**, so pinning Node 24 via `.nvmrc` is
not enough on its own — it grants the capability, not the behaviour. And since
Node builds its TLS root store during process startup, the flag cannot be
applied from `.env.local` (Next reads that long after boot) or from application
code such as `src/lib/db/client.ts`. It has to be in place *before Node starts*.

That is the whole job of `scripts/with-corp-ca.cjs`: it re-spawns Next as
`node --use-system-ca <next-bin>`, and the three npm scripts route through it.
Passing the flag as a node argument rather than via `NODE_OPTIONS` keeps any
`NODE_OPTIONS` you already have set intact.

Off such a network the flag is harmless — it *adds* the OS roots to Node's own
bundled list rather than replacing it, so public certificates validate exactly
as before and the same setup works on and off VPN.

Requires Node ≥ 22.15 (`.nvmrc` pins 24); run `nvm use` first. If you must use
Node 18 or 20, prepend `NODE_EXTRA_CA_CERTS=/path/to/root-ca.pem` instead, where
that PEM holds your proxy's root CA. To identify and export it on macOS:

```bash
# Which CA is re-signing the connection? (look at the last "i:" line)
echo | openssl s_client -connect <cluster-host>:27017 2>&1 | grep "i:"

# Export it
security find-certificate -a -c "<RootCAName>" -p \
  /Library/Keychains/System.keychain > root-ca.pem
```

If a TLS trust failure does occur, the driver now fails fast with an actionable
message instead of retrying a deterministic error five times (~53s per request).

---

## 📋 Implemented Features

### ✅ Authentication (Phase 2)
- **Sign Up** — Username, email, phone, DOB, password with live validation
- **Log In** — Email or username + password
- **Password Recovery** — 4-field identity verification, 10-min reset token
- **JWT Auth** — Secure HTTP-only cookies, 7-day expiration
- **Rate Limiting** — 5 signup/15 min, 10 login/15 min, 5 recovery/15 min

### ✅ Match Management (Phases 3-6)
- **Create Match** — 3-step wizard: basics → tiebreakers → player selection
- **Match Room** — Leaderboard + Scoreboard in split/stacked layout
- **Scoring** — Atomic round submission (all-or-nothing), edit with history
- **DNF Support** — Mark players as Did Not Finish, rejoin later
- **Late Joiners** — Blank cells for pre-join rounds, average over played only
- **Roster Management** — Add players mid-match, version-tracked updates

### ✅ Leaderboard & Ranking (Domain Logic)
- **Real-time Calculation** — Ranking by total, tiebreakers (avg, consistency)
- **Shared Positions** — Correctly handles ties with proper gap calculation
- **Interval/Leader Flip** — 5-second toggle between gap-to-ahead vs gap-to-leader
- **DNF Rendering** — Pinned at bottom, muted, still shows computed position
- **Position Colors** — Purple/Green/Yellow for 1st–3rd, Red for last active, Neutral for mid

### ✅ Friends System (Phase 7)
- **Friend Requests** — Send, accept, decline, delete
- **Profiles** — Public profile with stats and medals
- **Search** — Find users by username, email, or phone
- **Stats Tracking** — Matches played/won, games played/won, 🥇🥈🥉 medals

### ✅ Sharing & Discovery (Phase 8)
- **Share Links** — Generate 6-char codes, 30-day expiry, revocable
- **Auto-Join** — Redeem code → instant access (no approval)
- **Request to Join** — Ask creator for access, approve/decline workflow
- **Fuzzy Search** — Friends' matches + exact global search

### ✅ Notifications (Phase 9)
- **7 Event Types** — friend-request, friend-accepted, join-request, join-approved, join-declined, added-to-match, match-ended
- **20-Second Poll** — Efficient background sync with exponential backoff
- **Unread Badge** — Header bell shows count, mark as read on view

### ✅ Profiles (Phase 10)
- **Edit Profile** — Update name, phone, DOB (username/email fixed)
- **Public Profile** — View any user's stats and medals
- **Medals Table** — Won count + currently-leading count per position

### ✅ Realtime & Persistence (Phase 5-11)
- **HTTP Polling** — 5s match polling with version tracking (204 if unchanged)
- **Visibility Pause** — Stops polling when tab hidden, resumes on focus
- **Exponential Backoff** — 5s → 10s → 20s → 30s on errors
- **Offline Support** — Last-known state via localStorage, disable writes offline
- **Zustand Stores** — 6 stores for auth, UI, matches, friends, notifications, creation flow

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/                    # Public auth pages
│   │   ├── page.tsx               # Login/Signup tabs
│   │   └── forgot-password/       # Recovery flow
│   ├── (app)/                     # Protected app routes
│   │   ├── dashboard/             # Main dashboard
│   │   ├── matches/
│   │   │   ├── create/            # 3-step wizard
│   │   │   ├── join/              # Search & request
│   │   │   └── [id]/              # Match room
│   │   ├── profile/               # User profiles
│   │   └── notifications/         # Full notification view
│   ├── api/                       # 25+ API endpoints
│   │   ├── auth/                  # Auth endpoints
│   │   ├── matches/               # Match CRUD & rounds
│   │   ├── friends/               # Friend management
│   │   ├── users/                 # User profiles & search
│   │   └── notifications/         # Notifications
│   ├── layout.tsx                 # Root layout + providers
│   └── page.tsx                   # Landing redirect
├── components/
│   ├── auth/                      # Login, signup forms
│   ├── match/                     # Match UI components
│   ├── dashboard/                 # Dashboard widgets
│   ├── providers/                 # Theme provider
│   ├── ui/                        # Base UI (button, card, etc.)
│   └── common/                    # Header, offline banner, etc.
├── lib/
│   ├── db/                        # MongoDB client & collections
│   ├── auth/                      # JWT, password, rate limiting
│   ├── domain/                    # Pure ranking logic (tested)
│   ├── api/                       # Response helpers
│   ├── schemas/                   # Zod validation schemas
│   └── logger.ts                  # Winston logging
├── store/                         # Zustand stores
├── hooks/                         # Custom hooks (useAuth, usePolledResource)
├── styles/                        # Global CSS + Tailwind config
└── types/                         # TypeScript interfaces
```

---

## 🔌 API Endpoints (25 Total)

### Auth (5)
```
POST   /api/auth/signup                       # Register
POST   /api/auth/login                        # Login
POST   /api/auth/logout                       # Logout
GET    /api/auth/me                           # Current user
GET    /api/auth/username-available?u=        # Check availability
POST   /api/auth/recover/verify               # Verify identity
POST   /api/auth/recover/reset                # Reset password
```

### Matches (9)
```
POST   /api/matches                           # Create match
GET    /api/matches                           # List user's matches
GET    /api/matches/[id]                      # Match details
GET    /api/matches/[id]/state?v=             # Polling endpoint
POST   /api/matches/[id]/rounds               # Submit scores
PUT    /api/matches/[id]/rounds/[round]       # Edit round
GET    /api/matches/[id]/rounds               # List rounds
POST   /api/matches/[id]/roster               # Add player mid-match
PATCH  /api/matches/[id]/roster/[userId]     # DNF/rejoin
```

### Friends (5)
```
GET    /api/friends                           # List friends
POST   /api/friends                           # Send request
GET    /api/friends/requests                  # List requests
POST   /api/friends/requests/[id]             # Accept/decline
DELETE /api/friends/[userId]                  # Remove friend
```

### Users (3)
```
GET    /api/users/me                          # Full profile
PATCH  /api/users/me                          # Update profile
GET    /api/users/[username]                  # Public profile
```

### Share & Join (4)
```
POST   /api/matches/[id]/share                # Generate share code
GET    /api/join/[code]                       # Validate code
POST   /api/join/[code]                       # Redeem code
POST   /api/matches/[id]/join-requests        # Request to join
GET    /api/matches/[id]/join-requests        # List (creator only)
POST   /api/matches/[id]/join-requests/[id]   # Approve/decline
```

### Notifications (3)
```
GET    /api/notifications                     # List notifications
PATCH  /api/notifications/[id]                # Mark as read
POST   /api/notifications/mark-all-read       # Bulk mark read
```

---

## 🧪 Testing

### Unit Tests (Domain Logic)
```bash
npm test
```

Covers:
- Ranking algorithm with tiebreakers (worked example from spec)
- Shared positions & DNF placement
- Standard deviation calculation
- Zero-state handling
- All tiebreaker combinations

### Manual Testing Checklist

```bash
1. Start dev server
   npm run dev

2. Test signup flow
   - Visit http://localhost:3000
   - Click "Sign Up"
   - Fill form with valid data
   - Submit (requires MongoDB running)

3. Test match creation
   - Click "Create Match"
   - Step 1: Name, role, rank preference
   - Step 2: Choose tiebreakers
   - Step 3: Add at least 2 players
   - Submit

4. Test scoring
   - Enter round 1 scores
   - View leaderboard with correct ranking
   - Watch Interval/Leader toggle every 5s

5. Test friends
   - Search for users
   - Send friend request
   - Accept/decline

6. Test notifications
   - Header bell badge shows unread count
   - Notifications poll every 20s
```

---

## 🔐 Security

✅ **Authentication**
- JWT with HS256 signing
- Secure HTTP-only cookies
- 7-day expiration

✅ **Authorization**
- Middleware checks auth on all `/api` routes
- Per-endpoint permission checks (creator-only, participant-only)
- No user info leakage in error messages

✅ **Rate Limiting**
- Signup: 5 per hour per IP
- Login: 10 per 15 minutes per IP
- Password recovery: 5 per 15 minutes per IP
- Username availability: 20 per minute per IP

✅ **Input Validation**
- Zod schemas on all API boundaries
- Password requirements: 8+ chars, 1 number, 1 special char
- Username: 3–20 chars, lowercase alphanumeric + underscore
- Phone: E.164 format validation

✅ **Data Protection**
- Passwords hashed with bcrypt (12 rounds)
- Recovery tokens: 10-min TTL, single-use
- Password/token fields redacted from logs
- Edit history audit trail on scores

---

## 🌐 Deployment

### Vercel (Recommended)

```bash
# 1. Push to GitHub
git push origin main

# 2. Connect to Vercel
# https://vercel.com/new → Select repo

# 3. Set environment variables
MONGODB_URI=<your-atlas-uri>
JWT_SECRET=<min-32-chars-random-string>
NODE_ENV=production

# 4. Deploy
vercel deploy --prod
```

### Manual Deployment

```bash
# Build
npm run build

# Start
npm run start
```

---

## 📊 Database Schema

### Collections

**users** — Accounts
- `_id`, `name`, `username` (unique), `email` (unique), `phone` (unique)
- `dob` (YYYY-MM-DD), `passwordHash`, `profilePicUrl`, `createdAt`, `updatedAt`

**matches** — Rooms
- `_id`, `name`, `nameLower`, `creatorId`, `creatorRole`, `rankPreference`
- `status`, `tiebreakers`, `roster`, `roundsPlayed`, `version`, `deletedAt`
- Indexes: `{creatorId, status}`, `{roster.userId, status}`, `{nameLower}`, `{deletedAt}`

**scores** — Round scores
- `_id`, `matchId`, `round`, `playerId`, `value`, `enteredBy`, `enteredAt`, `editHistory`
- Unique index: `{matchId, round, playerId}`

**friendships** — Connections
- `_id`, `userA`, `userB` (always sorted), `createdAt`

**friendRequests** — Pending connections
- `_id`, `fromUserId`, `toUserId`, `status`, `createdAt`, `respondedAt`

**joinRequests** — Match join requests
- `_id`, `matchId`, `userId`, `status`, `createdAt`, `respondedAt`

**shareLinks** — One-time codes
- `_id`, `matchId`, `code` (unique), `createdBy`, `createdAt`, `expiresAt`, `revokedAt`
- TTL index: `{expiresAt}`

**notifications** — Event queue
- `_id`, `userId`, `type`, `payload`, `read`, `createdAt`
- Index: `{userId, read, createdAt}`

---

## 🎨 UI/UX

### Design System
- **Dark mode first** (toggle in header)
- **Brand colors**: Black + red (playing card palette)
- **Position tokens**: Purple/Green/Yellow (top 3), Red (last), Neutral (mid), Grey (DNF)
- **Responsive**: Mobile-first (375px+), no horizontal scroll
- **Motion**: 150–250ms ease-out transitions (respects `prefers-reduced-motion`)

### Components

**Layout**
- Header with theme toggle, notifications bell, user menu
- Offline banner (sticky top, dismissible)
- Toast notifications (auto-dismiss)

**Match UI**
- Leaderboard: Name, position chip, gap toggle, animated reordering
- Scoreboard: Sticky header + S.no column, table scrolls in container
- Round form: Player inputs ordered by leaderboard position, color chips

**Dashboard**
- Self stats card (Matches played/won, Games played/won)
- Friends list (search, add, remove)
- Incoming requests panel
- Your Matches list (active/ended tabs)
- Join/Create actions

---

## 🛠️ Development

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: MongoDB Atlas
- **Auth**: JWT + jose
- **State**: Zustand (with persist)
- **Validation**: Zod
- **Logging**: Winston
- **Testing**: Vitest

### Code Standards
- 100% TypeScript strict mode
- Max 150 lines per component (split if longer)
- Pure functions for domain logic (no I/O)
- Zod validation on all API boundaries
- Winston logging on every API call
- Proper error handling with unique request IDs

### Build Checklist

```bash
# Type check
npx tsc --noEmit

# Lint (if configured)
npm run lint

# Build
npm run build

# Test
npm test
```

---

## 📝 Notes for Developers

### Key Files to Know

- **`src/lib/domain/ranking.ts`** — Pure ranking logic, highly tested
- **`src/middleware.ts`** — Auth guard, cookie verification
- **`src/lib/db/bumpVersion.ts`** — Version bumping for polling
- **`src/store/`** — All Zustand stores, source of truth for UI state
- **`src/hooks/usePolledResource.ts`** — Polling logic (5s matches, 20s notifications)

### Common Tasks

**Add a new API endpoint**
1. Create route handler in `src/app/api/...`
2. Add Zod schema in `src/lib/schemas/`
3. Use response helpers from `src/lib/api/respond.ts`
4. Log with `logApiRequest` / `logApiResponse`

**Add a new component**
1. Keep under 150 lines
2. Use `'use client'` if interactive
3. Import from Zustand stores for state
4. Use Tailwind for styling

**Add new domain logic**
1. Create pure function in `src/lib/domain/`
2. Add unit test in `.test.ts` file
3. No I/O, no side effects
4. Export types for use in components

---

## 📞 Support

For issues or questions:
1. Check the spec document (HAIKU_BUILD_PROMPT.md)
2. Review API endpoint documentation above
3. Check component examples in `src/components/`
4. Run unit tests to verify domain logic

---

## 📄 License

MIT

---

**Last Updated:** 2026-07-27  
**Build Status:** ✅ Production Ready
