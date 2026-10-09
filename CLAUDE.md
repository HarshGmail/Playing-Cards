# PlayingCards

Score tracker for card games (house variant: Least Count, see `docs/LEAST_COUNT.md`). Next 14 App Router, TS strict, MongoDB driver (no ORM), React Query v5, Zustand, Tailwind with `dark:` variants, lucide-react, Highcharts, framer-motion, Vitest.

## Commands

- Typecheck: `npx tsc --noEmit -p .`
- Tests: `npx vitest run <path>` (tests sit next to source as `*.test.ts`)
- DB scripts: `npm run db:script -- scripts/<file>.ts` (handles corp CA + DNS). Reading and adding fields/collections is fine; never delete user data.

## Where things live

- `src/app/api/**/route.ts` mirrors the URL exactly. `src/app/(app)` = authed pages, `(auth)` = login/recovery, `rules/` = public docs pages.
- `src/components/<area>/` grouped by feature (`match`, `profile`, `dashboard`, `calendar`, `layout`, `pwa`, ...). Shared bits in `common/` and `ui/`.
- `src/lib/domain/` = pure logic, no I/O, unit tested (ranking, rating, playerStats, streaks, milestones, calendar...). Exception: `matchInvites.ts` touches the DB.
- `src/lib/stats/` = DB-side counterparts that load data and call `domain/` (e.g. `stats/playerStats.ts` persists what `domain/playerStats.ts` computes).
- `src/lib/events/matchEvents.ts` = `onRoundsChanged` / `onMatchEnded` hooks that recompute standings, stats and send notifications.
- `src/lib/db/collections.ts` = DB doc types + collection getters. `src/types/index.ts` = client/API types.
- `src/lib/queries/` = React Query hooks per area; all keys in `queries/keys.ts`.
- `src/lib/notifications/` (in-app, `notifyMany` also fans out web push), `src/lib/push/`, `public/sw.js`.

Name collisions to be aware of:
- `components/match/Leaderboard.tsx` = live leaderboard inside a match; `components/profile/Leaderboard.tsx` = global/friends rating leaderboard.
- `components/match/Podium.tsx` is the podium visual; `LeaderboardPodium.tsx` wraps it with leaderboard data.
- `lib/cloudinaryUrl.ts` = client URL transforms; `lib/storage/cloudinary.ts` = server upload.

## Conventions

- No code comments in new or edited code. Use names, named constants and small helpers instead.
- API route pattern: see `src/app/api/users/[username]/stats/route.ts` — `requireAuth` -> `logApiRequest` -> DB -> `success()`/`error()` from `lib/api/respond`, plus `export const dynamic = 'force-dynamic'`. Zod schemas in `lib/schemas/`.
- Client fetching: `apiFetch<T>(url)` from `lib/api/fetcher.ts`.
- Reuse `Avatar`, `PlayerNameLink`, `POSITION_CLASSES`, `getPositionColor` rather than re-styling players/positions.
- Terminology: a **match** is the whole session; a **game** is one round in it. Match win = 1st in an ended match. Game win = best score in a round.

## AGENT_CONTEXT.json (read on demand, not up front)

Detailed specs for stats, rating, streaks, milestones, notifications and API response shapes. Only read it when touching those areas, and only the key you need:

- `jq 'keys' AGENT_CONTEXT.json` to list sections
- `jq '.contracts' AGENT_CONTEXT.json` — rating formula, stats/leaderboard/matches API shapes, match-won notification, push, notification TTL
- `jq '.contracts2' AGENT_CONTEXT.json` — streak and milestone definitions, fire badge, milestone notification expiry
- `jq '.data' AGENT_CONTEXT.json` — `Match.standings`, `playerStats`, `pushSubscriptions` collections

`owners`/`owners2` and `rules.ownership`/`rules.report` were for parallel multi-agent runs; ignore them otherwise. If the file and the code disagree, the code wins — update the file.
