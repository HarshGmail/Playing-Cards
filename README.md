# Playing Cards — Score Tracker

A real-time score tracker for card games, built around the house variant of Least Count ([rules](docs/LEAST_COUNT.md)).

## Features

- Matches with live round-by-round scoring, tiebreakers, DNF handling and late joiners
- Card picker with automatic round scoring for Least Count
- Live leaderboard, podium and score charts per match
- Elo-style player ratings, global and friends leaderboards, streaks and milestones
- Friends, match invites, share links and join requests
- In-app notifications and web push
- Installable PWA with offline fallback, dark mode

## Tech Stack

Next.js 14 (App Router) · TypeScript · MongoDB · React Query · Zustand · Tailwind CSS · Zod · Highcharts · Cloudinary · Vitest

## Getting Started

### Prerequisites

- Node.js ≥ 22.15 (`.nvmrc` pins 24, run `nvm use`)
- A MongoDB instance (Atlas or local)
- A Cloudinary account for profile pictures
- VAPID keys for web push (`npx web-push generate-vapid-keys`)

### Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>.

### Environment Variables

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Auth token signing secret (32+ chars) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Profile picture storage |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web push |

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm run start` | Production build and serve |
| `npm test` | Run unit tests |
| `npm run lint` | Lint |
| `npm run db:backfill-stats` | Rebuild player stats from all matches |
| `npm run db:notifications-ttl` | Backfill notification expiry |

### Behind a corporate VPN

If database requests fail with `self-signed certificate in certificate chain`, a proxy is re-signing TLS with an internal root CA that Node doesn't trust by default. The npm scripts already handle this: `scripts/with-corp-ca.cjs` starts Next with `node --use-system-ca` so Node trusts the OS certificate store. It is harmless off-VPN. On Node < 22.15, set `NODE_EXTRA_CA_CERTS=/path/to/root-ca.pem` instead.

## Project Structure

```text
src/
├── app/            Pages and API routes (api/ mirrors the URL)
├── components/     UI grouped by feature
├── lib/
│   ├── domain/     Pure, unit-tested game logic
│   ├── stats/      Stats and standings persistence
│   ├── db/         MongoDB client, collections, indexes
│   ├── queries/    React Query hooks
│   └── ...         auth, api helpers, notifications, push
└── types/          Shared client types
scripts/            DB maintenance scripts
docs/               Game rules
```

## Deployment

Deploys on Vercel. Set the environment variables above in the project settings.

## License

MIT
