# Playing Cards — Score Tracker · Build Specification

> Implementation prompt. Every decision below is already settled — do not re-litigate them.
> If something genuinely isn't covered here, follow the **Ambiguity** rule at the bottom.

---

## 1. Stack (fixed)

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Next.js 15.x (App Router)** | latest stable |
| Language | **TypeScript**, `strict: true` | no `any`, no `@ts-ignore` |
| UI | **Tailwind CSS + shadcn/ui only** | **do NOT install Material UI** — it conflicts with Tailwind theming and doubles bundle size |
| DB | **MongoDB Atlas** via official `mongodb` driver | no Mongoose |
| State | **Zustand** | with `persist` middleware where noted |
| Validation | **Zod** | one schema per API boundary, shared client+server |
| Auth | **JWT in httpOnly cookie** | `jose` library (Edge-compatible) |
| Realtime | **HTTP polling, 5s** | see §7 — socket.io comes later, build the seam now |
| Logging | **Winston** (server only) | see §12 |
| Deploy | **Vercel** | PWA installable |

### ⚠️ Next.js 15 breaking change — read this first

`params` and `searchParams` are **Promises** in Next 15. Most examples online are Next 14 and will silently break.

```tsx
// app/(app)/matches/[id]/page.tsx
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params          // ✅ must await
  ...
}

// app/api/matches/[id]/route.ts
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params          // ✅ must await
}
```

Apply this to **every** dynamic route and route handler.

---

## 2. Domain vocabulary (use these exact terms in code)

| Term | Meaning |
|---|---|
| **Match** | A room. Has a name, a creator, a roster, and many rounds. |
| **Round** | One row of the scoreboard — every player's score for that hand. Also called a **Game** in user-facing stats. |
| **Match won** | You finished 1st on the leaderboard when the match ended. |
| **Game won** | You had the best score in an individual round (respecting the match's rank preference). |
| **Scorer** | The match creator. Only they can write scores. |
| **DNF** | Did Not Finish — player left mid-match. Score frozen at the last round they played. |

So: profile shows **Matches Played / Matches Won** and **Games Played / Games Won**.

---

## 3. Design language

- **Brand:** black + red (playing-card palette). Dark mode is the default; light mode fully supported.
- **Tone:** modern, quiet, generous whitespace. Minimal copy — labels over sentences. No marketing text anywhere.
- **Mobile-first.** Design at 375px, then scale up. Every tap target ≥ 44px. No horizontal page scroll ever (the scoreboard table scrolls *within its own container* only).
- **Motion:** subtle and short (150–250ms, ease-out). Used for leaderboard position changes and the Interval/Leader flip. Nothing bouncy.
- **Position colours** (leaderboard + scoreboard headers):

| Position | Colour | Token |
|---|---|---|
| 1st | Purple | `--pos-1` |
| 2nd | Green | `--pos-2` |
| 3rd | Yellow | `--pos-3` |
| **Last active player** | Red | `--pos-last` |
| Everything between 3rd and last | Neutral / muted foreground | `--pos-mid` |
| DNF | Neutral grey, 60% opacity | `--pos-dnf` |

**Only the top three are fixed positions.** Red is reserved for whoever is currently **last among active players** — it moves as the standings move, and it is the only colour below 3rd. Every position between 3rd and last is neutral.

Resolution rules — implement in `lib/domain/positionColor.ts` as a pure function:

```ts
getPositionColor(position, isLast, isDnf) → 'pos-1'|'pos-2'|'pos-3'|'pos-last'|'pos-mid'|'pos-dnf'
```

- `isDnf` wins over everything → `pos-dnf`. DNF players are **excluded** when determining who is last, since "last" means last among those still playing.
- Positions 1/2/3 keep their colour **even if they are also last**. With 3 or fewer active players nobody is red — top-three colours simply cover everyone.
- If two or more players **share** the last position, they are **all** red.
- With 4 active players: 4th is both mid and last → red. With 6: 1 purple, 2 green, 3 yellow, 4–5 neutral, 6 red.
- Zero-state (`roundsPlayed === 0`): everyone is neutral. Don't colour a leaderboard that hasn't started.

Define these as CSS variables in `globals.css` with **separate light/dark values**. Position colours are used as **subtle tinted backgrounds** (roughly 12–15% opacity fill) with a solid left border or dot in the full colour — never as a full-saturation background behind text, which fails contrast. Verify text contrast ≥ 4.5:1 in both themes.

Note: brand red and last-place red must be visually distinguishable — use a cooler, slightly desaturated red for the position token so it never reads as a brand accent or an error state.

---

## 4. Data model (MongoDB)

**ID decision (settled):** `_id` is always an `ObjectId`. `username` is a **unique index**, not a primary key — usernames must stay mutable without cascading updates across every collection.

All dates are `Date` **except `dob`**, which is a `"YYYY-MM-DD"` string to avoid timezone off-by-one bugs.

### `users`
```ts
{
  _id: ObjectId
  name: string
  username: string            // unique, lowercase-stored, 3–20 chars, [a-z0-9_]
  email: string               // unique, lowercase-stored
  phone: string               // unique, E.164-ish normalised (digits only + optional leading +)
  dob: string                 // "YYYY-MM-DD"
  passwordHash: string        // bcrypt, 12 rounds
  profilePicUrl: string | null // schema only — NOT surfaced in MVP UI
  createdAt: Date
  updatedAt: Date
}
```
Indexes: `{username:1}` unique · `{email:1}` unique · `{phone:1}` unique

> `phone` **must** be unique — players are added to matches by phone, so a duplicate makes lookup ambiguous.

### `matches`
```ts
{
  _id: ObjectId
  name: string
  nameLower: string                       // for case-insensitive search
  creatorId: ObjectId
  creatorRole: 'score-only' | 'score-and-play'
  rankPreference: 'highest-first' | 'lowest-first'
  status: 'active' | 'ended'
  deletedAt: Date | null                  // soft delete — never hard-delete a match
  tiebreakers: TiebreakerId[]             // ordered array, length 3. see §6
  roster: [{
    userId: ObjectId
    joinedAtRound: number                 // 1 = present from the start
    status: 'active' | 'dnf'
    dnfAfterRound: number | null          // last round they scored in
    order: number                         // stable scoreboard column order
  }]
  roundsPlayed: number                    // authoritative count of submitted rounds
  version: number                         // ++ on EVERY mutation. drives polling. see §7
  createdAt: Date
  endedAt: Date | null
}
```
Indexes: `{creatorId:1, status:1}` · `{'roster.userId':1, status:1}` · `{nameLower:1}` · `{deletedAt:1}`

> If `creatorRole === 'score-only'`, the creator is **NOT** in `roster` — no scoreboard column, no leaderboard row. They are purely the scorer.

### `scores`
```ts
{
  _id: ObjectId
  matchId: ObjectId
  round: number                 // 1-indexed
  playerId: ObjectId
  value: number                 // integer, 0 ≤ value ≤ 99999
  enteredBy: ObjectId           // audit only — never displayed in MVP
  enteredAt: Date
  editHistory: [{ from: number, to: number, at: Date, by: ObjectId }]
}
```
Indexes: **`{matchId:1, round:1, playerId:1}` unique** (prevents double entry) · `{matchId:1, round:1}`

### `friendships`
```ts
{
  _id: ObjectId
  userA: ObjectId          // always the lexicographically smaller ObjectId
  userB: ObjectId          // always the larger — makes the pair canonical
  createdAt: Date
}
```
Index: `{userA:1, userB:1}` unique

> Always normalise the pair (sort the two ids) before insert or lookup. One row per friendship, not two.

### `friendRequests`
```ts
{
  _id: ObjectId
  fromUserId: ObjectId
  toUserId: ObjectId
  status: 'pending' | 'accepted' | 'declined'
  createdAt: Date
  respondedAt: Date | null
}
```
Index: `{toUserId:1, status:1}` · `{fromUserId:1, toUserId:1}` unique-on-pending (enforce in code)

### `joinRequests`
```ts
{
  _id: ObjectId
  matchId: ObjectId
  userId: ObjectId
  status: 'pending' | 'approved' | 'declined'
  createdAt: Date
  respondedAt: Date | null
}
```
Index: `{matchId:1, status:1}` · `{userId:1, status:1}`

### `shareLinks`
```ts
{
  _id: ObjectId
  matchId: ObjectId
  code: string             // 10 chars, crypto-random, URL-safe, no ambiguous chars (no 0/O/1/l/I)
  createdBy: ObjectId
  createdAt: Date
  expiresAt: Date          // createdAt + 15 minutes
  revokedAt: Date | null
}
```
Indexes: `{code:1}` unique · `{expiresAt:1}` **TTL index, expireAfterSeconds: 0**

### `notifications`
```ts
{
  _id: ObjectId
  userId: ObjectId              // recipient
  type: 'friend-request' | 'friend-accepted' | 'join-request'
      | 'join-approved' | 'join-declined' | 'added-to-match' | 'match-ended'
  payload: Record<string, unknown>   // { matchId?, matchName?, fromUserId?, fromName? }
  read: boolean
  createdAt: Date
}
```
Index: `{userId:1, read:1, createdAt:-1}`

---

## 5. Ranking engine — `lib/domain/ranking.ts`

**This is the heart of the app. Write it as pure functions with zero I/O, and unit-test it before wiring any UI.**

### Per-player aggregates

```ts
interface PlayerAggregate {
  playerId: string
  scores: number[]        // only rounds they actually played, in round order
  total: number           // sum
  roundsPlayed: number    // scores.length
  average: number         // total / roundsPlayed, or 0 if roundsPlayed === 0
  stdDev: number          // population standard deviation of scores
  isDnf: boolean
}
```

`stdDev`: `sqrt( mean( (x - mean)² ) )`. Return `0` when `roundsPlayed < 2`.

### Late joiners and DNF (settled)

- A player who joined at round 5 has **blank cells** for rounds 1–4 — not zeros. Their `total` covers only rounds they played, and `average` divides by `roundsPlayed`, not by `match.roundsPlayed`.
- A DNF player's scores freeze at `dnfAfterRound`. No cells after that.
- Blank cells render as `—`, visually muted.

### Sort order

1. **Primary: `total`.** `highest-first` → descending. `lowest-first` → ascending.
2. **Ties → walk `match.tiebreakers` in order**, first one that separates them wins.
3. **All tiebreakers equal → shared position.** Both get the same position number; the next player skips (1, 2, 2, 4). The UI must handle duplicate position numbers and duplicate colours.

### DNF placement (settled)

DNF players are ranked **by their frozen score, exactly like anyone else**, for position number, tiebreakers, and stats. But in the leaderboard they are **rendered in a separate muted group pinned to the bottom**, below all active players, showing their computed position number.

So a DNF player who is mathematically 2nd shows "2" in a greyed row at the bottom. Score truth is preserved; visual signal is clear.

### Gaps — Interval vs Leader

Every player gets two numbers:

- `gapToLeader` = `|total − leaderTotal|`
- `gapToAhead` = `|total − totalOfPlayerOnePositionAbove|` (leader's is `null`)

Both always non-negative — the absolute difference, regardless of rank preference.

### `computeLeaderboard(aggregates, rankPreference, tiebreakers) → LeaderboardEntry[]`

```ts
interface LeaderboardEntry {
  position: number         // shared positions repeat
  playerId: string
  name: string
  total: number
  average: number
  stdDev: number
  roundsPlayed: number
  gapToLeader: number
  gapToAhead: number | null
  isDnf: boolean
  isSharedPosition: boolean
  isLast: boolean          // last among ACTIVE players — drives the red token (§3)
}
```

### Games won — `computeGamesWon(scoresByRound, rankPreference)`

For each round, find the best value (max if highest-first, min if lowest-first). Every player matching it wins that round — ties both count. Only rounds a player participated in count toward their `gamesPlayed`.

### Zero-state

Before any round is submitted, everyone is tied at `total: 0`. Order by `roster.order` (join order) and show all as shared position 1... **no** — that's noisy. Instead: when `roundsPlayed === 0`, render the leaderboard in join order with position numbers 1..n greyed out and no gap column, plus a quiet "No rounds yet" line.

---

## 6. Tiebreakers

Four criteria exist:

```ts
type TiebreakerId =
  | 'lower-average'      // lower average per round ranks higher
  | 'higher-average'     // higher average per round ranks higher
  | 'more-consistent'    // LOWER standard deviation ranks higher
  | 'less-consistent'    // HIGHER standard deviation ranks higher
```

### Availability is filtered by rank preference

- `lowest-first` → offer `lower-average`, `more-consistent`, `less-consistent`
- `highest-first` → offer `higher-average`, `more-consistent`, `less-consistent`

(The contradictory average direction is hidden — a "lowest score wins" match never ranks *higher* average better.)

### UI: an ordered, reorderable list — not three fixed dropdowns

Show the three available criteria as a **reorderable list** (drag handle, or up/down arrow buttons — arrows are more reliable on mobile, prefer those). The order *is* the cascade. Default order:

1. `more-consistent`
2. `lower-average` / `higher-average`
3. `less-consistent`

**Why consistency is default-primary:** average only differentiates tied players when their `roundsPlayed` differ (average = total ÷ rounds; equal totals + equal rounds ⟹ equal averages, always). So average-as-primary silently falls through in the most common tie. Standard deviation is the criterion that actually separates players.

Show this as a one-line hint under the list: *"Average only separates players who played a different number of rounds."*

### Worked example (use this as a unit test)

```
        R1  R2  R3  R4   total  avg     stdDev
P1      20   0  10  25     55   13.75    9.55
P2      20  30   0   5     55   13.75   12.03
P3       0  60  30  45    135   33.75   21.65
P4      45  45  45   0    135   33.75   19.49
```

`lowest-first`, tiebreakers `['more-consistent', 'lower-average', 'less-consistent']`:

- P1 vs P2: total tied, avg tied → `more-consistent` → P1 (9.55 < 12.03) → **P1 1st, P2 2nd**
- P3 vs P4: total tied, avg tied → `more-consistent` → P4 (19.49 < 21.65) → **P4 3rd, P3 4th**

Assert exact positions and gaps: P2 `gapToAhead: 0`, P4 `gapToLeader: 80`.

---

## 7. Realtime: polling now, sockets later

**Settled: 5-second HTTP polling. Do not install socket.io.** But build it behind an abstraction so swapping in sockets later touches one file, not thirty.

### Server side: version stamping

Every mutation to a match (`scores` write, roster change, status change) **increments `match.version`** in the same operation. Do this in a single helper — `lib/db/bumpVersion.ts` — so it can't be forgotten.

### The state endpoint

`GET /api/matches/[id]/state?v=<clientVersion>`

- If `clientVersion === match.version` → `200 { changed: false, version }` (tiny payload)
- Else → `200 { changed: true, version, match, scores, leaderboard, roster, pendingJoinRequests? }`

`pendingJoinRequests` is included **only** when the requester is the creator.

The leaderboard is computed **server-side** using `lib/domain/ranking.ts` and shipped ready to render. The same pure functions are importable client-side for optimistic updates.

### Client side: `hooks/usePolledResource.ts`

One generic hook. Requirements:

- Polls on an interval, tracks `version`, only updates the Zustand store when `changed: true`
- **Pauses when `document.visibilityState === 'hidden'`**, resumes and immediately refetches on `visibilitychange`. Non-negotiable — this is a phone app and background polling drains battery and burns Vercel invocations.
- Pauses when `navigator.onLine === false`
- Cancels in-flight requests on unmount (`AbortController`)
- Exponential backoff on error: 5s → 10s → 20s → cap 30s; reset on success
- Never overlaps requests

Intervals:

| Resource | Interval |
|---|---|
| Match state (in a match room) | **5s** |
| Notifications | **20s** |
| Dashboard (friends, your matches) | **on mount + on window focus only** — no interval |

### The socket seam

Components must **never** call `fetch` for live data or know that polling exists. They read from the Zustand store. `usePolledResource` is the only thing that writes live data into it. Swapping to socket.io later means replacing that one hook.

---

## 8. Screens

### 8.1 Landing `/` — unauthenticated

Split view: brand mark + one-line tagline, and a card with **Log in / Sign up** tabs. Redirect to `/dashboard` if already authenticated.

**Sign up fields:** Name · Username · Email · Phone · DOB · Password

- **Username:** live availability check, debounced 400ms, against `GET /api/auth/username-available?u=`. Three states: neutral / ✓ available / ✗ taken. Never block typing. Rules: 3–20 chars, `[a-z0-9_]`, stored lowercase.
- **Password:** min 8 chars, ≥1 number, ≥1 special char. Show an inline live checklist of the three rules — not a single error string.
- **DOB:** native `<input type="date">`. Reject future dates.
- **Phone:** normalise before submit; show a clear error if already registered.

**Log in:** email *or* username + password. Generic error on failure — never reveal whether the account exists.

### 8.2 Forgot password `/forgot-password`

Settled design: **no email is sent.** Two steps.

1. **Verify identity** — user enters username + email + phone + DOB. All four must match one user record exactly.
2. **Set new password** — on success, issue a short-lived (10 min), single-use, httpOnly reset cookie, then show the new-password form.

Rate limit: **5 attempts per 15 minutes per IP**, and lock further attempts on that username for 15 minutes after 5 failures. Same generic error for every failure mode.

> ⚠️ Known weakness, accepted for MVP: anyone who knows those four fields can reset the password — which includes most of a user's friends. Do not remove the rate limiting.

### 8.3 Dashboard `/dashboard`

Vertical stack on mobile; two columns ≥1024px. Order top to bottom:

**A · Your stats** — name as heading, then a compact 3-stat row:
`Games Played · Games Won · Active Matches`

**B · Friends** — a card with two tabs:

- **Friends** (default) — vertical scroll list on mobile, horizontal on desktop. ~2–3 cards visible before scroll. Each card: name, then `Games Played · Games Won · Active`. Tap → `/profile/[username]`. Overflow menu per card: *Remove friend* (with confirm).
  Empty state: one line + a button that switches to the Find tab.
- **Find** — search input (username, email, or phone). Results show name, @username, and their 3 stats. Trailing control per row is state-aware: **Add** / *Pending* (disabled) / *Friends* (disabled) / *Accept* (they already requested you).

**C · Incoming requests** — only rendered when non-empty. Friend requests and match join requests, each with Accept / Decline.

**D · Your matches** — **do not omit this; it is the only way back into an ongoing match.** Two groups: *Active* then *Ended* (ended collapsed by default). Each row: match name, player count, round count, your current position chip. Tap → `/matches/[id]`.

**E · Actions** — `Join Match` and `Create Match`. Full-width stacked on mobile.

### 8.4 Create match `/matches/create` — 3 steps, progress indicator

**Step 1 — Basics**
- Match name (required, 3–50 chars)
- Your role: `Score Only` / `Score & Play` — explain in a sub-label that Score Only keeps you off the board
- Rank preference: `Highest score wins` / `Lowest score wins`

**Step 2 — Tiebreakers**
The reorderable list from §6, filtered by the Step 1 rank preference. If the user goes back and flips rank preference, **re-filter and reset to default order** — don't leave a contradictory criterion selected.

**Step 3 — Players**
- Input accepting username, email, or phone. **No autocomplete, no suggestions** — exact match required by design.
- Submit → server resolves one user or returns not-found. On success, add to a list below with a remove control.
- Errors: not found · already added · that's you.
- Require **at least 1** player besides the creator.
- `Create Match` → POST, then redirect to the match room.

### 8.5 Match room `/matches/[id]`

**Access control:** roster member or creator only. Anyone else gets a "request to join" screen, not the board.

**Header:** match name · creator name · `Ended` badge if ended · Share button (creator) · overflow menu (creator: *End match*, *Delete match*).

**Layout:** desktop ≥1024px — leaderboard left 30%, board right 70%. Mobile — leaderboard first, full width, then the board.

#### Leaderboard (the F1 board)

Rows: `[position chip] Name — [gap]`

The gap column **alternates every 5 seconds** between two modes, with a **short, clean crossfade (~200ms)** — subtle, not flashy. Both modes are driven by one timer so every row flips in unison.

| Mode | Column header | Each row shows |
|---|---|---|
| `interval` | **INTERVAL** | `gapToAhead` — gap to the player one position above. Leader's row shows `—` |
| `leader` | **LEADER** | `gapToLeader` — gap to 1st. Leader's row shows `—` |

The header label sits above the gap column and switches with the values. Respect `prefers-reduced-motion`: skip the crossfade, still switch.

Position changes between polls animate with a brief vertical slide (~200ms).

DNF players: muted group at the bottom, separated by a hairline rule, each still showing its computed position number.

#### Tab 1 · Scoreboard (everyone)

| S.no | Player A | Player B | Player C |
|---|---|---|---|
| **Total** | 55 | 55 | 135 |
| 1 | 20 | 20 | 0 |
| 2 | 0 | 30 | 60 |

- Column order is `roster.order` (stable, never reorders) — only the leaderboard reorders.
- Header cells carry the player's **current position tint**.
- Total row is sticky under the header; the S.no column is sticky left. The table scrolls **inside its container** — the page never scrolls sideways.
- Blank cell (late joiner / post-DNF) → `—`, muted.
- DNF column header shows a small `DNF` badge.

#### Tab 2 · Enter scores (creator only — do not render the tab for others)

- Heading: `Round {roundsPlayed + 1}`
- One numeric input per **active** roster player, ordered by **current leaderboard position**, each labelled with the player's name and a **position colour chip** so a reshuffle between rounds is visually obvious before typing.
- `inputMode="numeric"`, integers only, 0–99999.
- All inputs required — **a round submits atomically, all or nothing.** Partial rounds are not a valid state.
- Per-player **Mark DNF** control here: excludes them from this and future rounds, sets `status: 'dnf'` and `dnfAfterRound = roundsPlayed`.
- Below the form: a list of submitted rounds, each with **Edit** → reopens that round with existing values prefilled; saving overwrites all of that round's scores and appends to `editHistory`.

**DNF rejoin:** creator-only control in a Roster panel. Sets `status: 'active'`, leaves `dnfAfterRound` as history, and sets `joinedAtRound = roundsPlayed + 1` so the gap rounds stay blank rather than zero.

### 8.6 Join match `/matches/join`

Search by name, **fuzzy**. Scope (settled):

- **Fuzzy** across active matches created by **your friends**
- **Exact name match** across all active matches (so a stranger's room is reachable only by typing it exactly)

Results show match name, creator name, player count, created date — needed because match names are **not unique**. Action → `Request to join`, creating a `joinRequest` and notifying the creator. Show `Requested` afterwards.

Implementation: case-insensitive regex on `nameLower` plus a Levenshtein-distance sort in `lib/domain/search.ts` (pure, testable). Don't reach for Atlas Search.

### 8.7 Share link

Creator taps Share → `POST /api/matches/[id]/share` → `{ code, expiresAt }`, rendered as `{origin}/join/{code}` with a Copy button, a live countdown, and **Revoke**. Generating a new link revokes the previous one.

`/join/[code]`: valid + unexpired + not revoked → **join immediately, no approval**, redirect to the room. Invalid/expired/revoked → a plain explanatory screen with a link to search by name instead. Unauthenticated → send through login/signup, preserve the code, then auto-join.

### 8.8 Profile `/profile` (self) and `/profile/[username]`

- Identity block: Name, @username, and — **on your own profile only** — email, phone, DOB.
- Own profile: `Edit` → Name, Phone, DOB. Username and email are **not** editable in MVP. `profilePicUrl` exists in the schema but **render no avatar UI at all**.
- Stats: `Matches Played · Matches Won · Games Played · Games Won`
- Medals table — each row shows finished count and current-standing count:
  ```
  🥇   5 won      3 leading
  🥈   2          1
  🥉   4          0
  ```
  "won/leading" = finished matches where you placed there, and active matches where you currently sit there.
- Friend-facing profile: name, @username, stats, medals. No contact details.

### 8.9 Notifications

Bell icon in the header with an unread count. Panel lists notifications newest-first, unread visually distinct, tapping marks read and navigates to the relevant match or profile. Polled every 20s (§7).

Triggering events: friend request received · friend request accepted · join request received (creator) · join request approved/declined · added to a match · match ended.

### 8.10 Offline

Detect via `navigator.onLine` + `online`/`offline` events. Show a persistent slim banner: `Offline — showing last known scores`. Persist the last match state to `localStorage` (keyed by match id) and hydrate from it on load. **No offline writes** — disable the score form entirely while offline; do not queue submissions.

---

## 9. API surface

All handlers: Zod-validate input → authenticate → authorise → act → log → return. Errors are `{ error: string, code: string }` with a correct HTTP status. Never leak stack traces or Mongo errors to the client.

### Auth
| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/signup` | creates user, sets cookie |
| POST | `/api/auth/login` | `{ identifier, password }` — email or username |
| POST | `/api/auth/logout` | clears cookie |
| GET | `/api/auth/me` | current user, or 401 |
| GET | `/api/auth/username-available?u=` | **rate limit 20/min/IP** — enumeration surface |
| POST | `/api/auth/recover/verify` | 4-field identity check → sets reset cookie |
| POST | `/api/auth/recover/reset` | `{ password }` + reset cookie |

### Users
| Method | Path | Notes |
|---|---|---|
| GET | `/api/users/me` | full self profile + stats |
| PATCH | `/api/users/me` | `{ name?, phone?, dob? }` |
| GET | `/api/users/[username]` | public profile + stats |
| GET | `/api/users/lookup?q=` | exact match on username\|email\|phone — for adding players |

### Friends
| Method | Path |
|---|---|
| GET | `/api/friends` |
| GET | `/api/friends/search?q=` |
| POST | `/api/friends/requests` |
| GET | `/api/friends/requests` |
| POST | `/api/friends/requests/[id]/accept` |
| POST | `/api/friends/requests/[id]/decline` |
| DELETE | `/api/friends/[userId]` |

### Matches
| Method | Path | Notes |
|---|---|---|
| POST | `/api/matches` | create |
| GET | `/api/matches` | your matches, grouped active/ended |
| GET | `/api/matches/[id]` | full detail |
| GET | `/api/matches/[id]/state?v=` | **polling endpoint** (§7) |
| PATCH | `/api/matches/[id]` | `{ status: 'ended' }` — creator |
| DELETE | `/api/matches/[id]` | **soft delete** — sets `deletedAt`, creator only |
| GET | `/api/matches/search?q=` | friends-fuzzy + global-exact (§8.6) |
| POST | `/api/matches/[id]/roster` | creator adds a player mid-match |
| PATCH | `/api/matches/[id]/roster/[userId]` | `{ status: 'dnf' \| 'active' }` — creator |

### Rounds — batch, never per-cell
| Method | Path | Notes |
|---|---|---|
| POST | `/api/matches/[id]/rounds` | `{ scores: [{playerId, value}] }` — creates the next round atomically |
| PUT | `/api/matches/[id]/rounds/[round]` | replaces every score in that round, appends `editHistory` |

Both: creator only · match must be `active` · all active roster players must be present · bump `version`.

### Join requests, share, notifications
| Method | Path |
|---|---|
| POST | `/api/matches/[id]/join-requests` |
| GET | `/api/matches/[id]/join-requests` (creator) |
| POST | `/api/matches/[id]/join-requests/[id]/approve` |
| POST | `/api/matches/[id]/join-requests/[id]/decline` |
| POST | `/api/matches/[id]/share` (creator) |
| DELETE | `/api/matches/[id]/share` (creator, revoke) |
| POST | `/api/join/[code]` (redeem) |
| GET | `/api/notifications?since=` |
| POST | `/api/notifications/read` |

### Rate limits (in-memory LRU is fine for MVP; note it resets per serverless instance)
`login` 10/15min/IP · `signup` 5/hr/IP · `username-available` 20/min/IP · `recover/verify` 5/15min/IP

---

## 10. Folder structure

```
src/
├── app/
│   ├── layout.tsx                    # theme provider, offline banner, toaster
│   ├── page.tsx                      # landing
│   ├── manifest.ts                   # PWA manifest (Next 15 metadata route)
│   ├── (auth)/
│   │   ├── forgot-password/page.tsx
│   │   └── join/[code]/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx                # header + bell + auth guard
│   │   ├── dashboard/page.tsx
│   │   ├── profile/page.tsx
│   │   ├── profile/[username]/page.tsx
│   │   └── matches/
│   │       ├── create/page.tsx
│   │       ├── join/page.tsx
│   │       └── [id]/page.tsx
│   └── api/…                          # exactly as §9
├── middleware.ts                      # ⚠️ src/middleware.ts — NOT src/app/middleware.ts
├── components/
│   ├── ui/                            # shadcn primitives
│   ├── auth/          LoginForm · SignupForm · UsernameField · PasswordField
│   │                  · RecoverIdentityForm · NewPasswordForm
│   ├── dashboard/     SelfStatsCard · FriendsPanel · FriendsList · FriendCard
│   │                  · FindFriendsTab · IncomingRequestsPanel · YourMatchesList
│   │                  · MatchListItem · DashboardActions
│   ├── match/         MatchHeader · Leaderboard · LeaderboardRow · PositionChip
│   │                  · GapCell · Scoreboard · ScoreboardHeader · ScoreboardRow
│   │                  · RoundEntryForm · PlayerScoreInput · SubmittedRoundsList
│   │                  · RosterPanel · ShareLinkDialog · JoinRequestsPanel
│   ├── profile/       ProfileIdentity · EditProfileForm · StatsRow · MedalsTable
│   └── common/        ThemeToggle · Header · NotificationBell · NotificationList
│                      · OfflineBanner · EmptyState · Spinner · ConfirmDialog
├── lib/
│   ├── db/            client.ts · collections.ts · indexes.ts · bumpVersion.ts
│   ├── auth/          jwt.ts · password.ts · session.ts · rateLimit.ts
│   ├── domain/        ranking.ts · scoring.ts · stats.ts · search.ts
│   │                  · tiebreakers.ts · gaps.ts · positionColor.ts
│   │                                                    ← ALL PURE, ALL TESTED
│   ├── api/           respond.ts · guards.ts · handler.ts
│   ├── logger.ts
│   └── schemas/       auth.ts · match.ts · round.ts · user.ts · friend.ts
├── hooks/             useAuth · usePolledResource · useMatchState
│                      · useNotifications · useOnlineStatus · useIntervalToggle
├── store/             authStore · matchStore · notificationStore · uiStore
├── types/             index.ts
└── styles/            globals.css
```

### Layer rules — enforce strictly

- **`.tsx` = presentation and event wiring only.** No arithmetic, no sorting, no ranking, no date math, no `fetch`.
- **`.ts` in `lib/domain/` = pure functions.** No I/O, no `Date.now()` passed implicitly (take `now` as a parameter where time matters), no imports from `components/`.
- Components read state from Zustand or props. Only hooks talk to the network.
- One component per file. Target under 150 lines; hard ceiling 250 — split before exceeding it.
- Every domain function gets a unit test. The §6 worked example must be one of them.

---

## 11. Zustand stores

```ts
// authStore  — NOTE: no `token` field. The JWT is httpOnly; JS cannot read it.
{ user: User | null, status: 'loading'|'authed'|'anon',
  setUser, clear, refresh }

// matchStore
{ matchId: string | null, version: number,
  match: Match | null, roster: RosterEntry[], scores: Score[],
  leaderboard: LeaderboardEntry[], pendingJoinRequests: JoinRequest[],
  isStale: boolean,                       // true while offline / showing cache
  setState(payload), reset() }

// notificationStore
{ items: Notification[], unreadCount: number, setItems, markRead }

// uiStore  — persisted to localStorage
{ theme: 'light'|'dark'|'system', gapMode: 'interval'|'leader',
  activeMatchTab: 'scoreboard'|'entry', setTheme, toggleGapMode }
```

`gapMode` lives in the store so every leaderboard row flips in unison from a single 5s timer in `useIntervalToggle`.

---

## 12. Logging — `lib/logger.ts`

Winston, **server-side only** (never import into a client component — it will break the bundle).

- Levels: `error` · `warn` · `info` · `debug`. Production `info`, development `debug`.
- Transports: JSON to `console` (Vercel captures stdout — file transports do not persist on serverless). Add a file transport **only** when `NODE_ENV === 'development'`.
- Every API handler logs one `info` on entry (route, userId, key params) and one on completion (status, duration ms). Every caught error logs `error` with the stack.
- **Never log** passwords, hashes, JWTs, or reset cookies. Redact by key name.
- Include a per-request `requestId` (`crypto.randomUUID()`) in every line for that request.

```ts
logger.info('round.submitted', { requestId, matchId, round, playerCount, durationMs })
```

---

## 13. PWA

- `app/manifest.ts` (Next 15 metadata route): `name`, `short_name`, `display: 'standalone'`, `start_url: '/dashboard'`, `background_color` and `theme_color` matching the dark theme, `orientation: 'portrait'`.
- Icons in `public/`: `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` (with safe-zone padding), `apple-touch-icon.png` (180×180).
- iOS needs the `apple-touch-icon` link and `apple-mobile-web-app-*` meta tags — set via `metadata` in the root layout. Without these, Add to Home Screen renders a screenshot instead of an icon.
- Service worker via **`serwist`** (`next-pwa` is unmaintained). Cache the app shell and static assets. **Never cache API responses** — stale scores are worse than a spinner. Match state caching goes through `localStorage` (§8.10), not the SW.
- Verify installability in Chrome DevTools → Application → Manifest, and confirm the Install prompt appears.

---

## 14. Build order

Finish each phase completely, then run the **gate** before starting the next. Do not build ahead.

**Gate (after every phase, without exception):**
```bash
npx tsc --noEmit          # must be clean
npm run lint              # must be clean
npm run build             # must succeed
npm test                  # once tests exist — must pass
```

| # | Phase | Deliverable |
|---|---|---|
| 0 | **Scaffold** | Next 15 + TS strict + Tailwind + shadcn init. `lib/db/client.ts` with cached connection (dev HMR safe). `lib/logger.ts`. `indexes.ts` with an idempotent `ensureIndexes()`. Theme provider + toggle. `.env.example`. |
| 1 | **Domain core — do this before any UI** | `lib/domain/*` fully implemented and unit-tested: aggregates, stdDev, tiebreakers, `computeLeaderboard`, gaps, gamesWon, stats, fuzzy search. **The §6 worked example must pass.** This is the highest-risk logic in the app; getting it right first makes every screen downstream trivial. |
| 2 | **Auth** | signup, login, logout, `me`, username availability, JWT cookie, `middleware.ts` route guard, recovery flow + rate limiting. Landing page. |
| 3 | **Shell** | `(app)` layout, header, theme toggle, offline banner, toaster, protected routing, dashboard skeleton with real self-stats. |
| 4 | **Matches + scoring** | create flow (3 steps), match room, scoreboard, round entry, round edit, `/matches/[id]/state`. Leaderboard rendering with the **Interval/Leader 5s flip**. |
| 5 | **Polling** | `usePolledResource` with visibility pause, backoff, abort. Wire match state. Verify in two browsers: enter a score in one, see it in the other within 5s. |
| 6 | **Roster lifecycle** | DNF mark, DNF rejoin, mid-match add, late-joiner blank cells, DNF pinned-last rendering, end match, soft delete. |
| 7 | **Friends** | friendships, requests, dashboard Friends/Find tabs, incoming requests, public profiles. |
| 8 | **Join + share** | join-by-name search (friends-fuzzy + global-exact), join requests + approval, share link generate/redeem/revoke/expire, `/join/[code]`. |
| 9 | **Notifications** | collection, emit on all seven events, bell + panel, 20s poll. |
| 10 | **Profile** | full profile, edit, stats, medals table. |
| 11 | **PWA + polish** | manifest, icons, serwist, offline caching, mobile pass at 375px, contrast check both themes, `prefers-reduced-motion`. |
| 12 | **Ship** | `ensureIndexes()` run against Atlas, env vars on Vercel, deploy, smoke test on a real phone. |

---

## 15. Testing

- **Unit (required):** everything in `lib/domain/`. Use Vitest. Cover: the §6 example · shared positions · DNF frozen scores · late joiner blank cells and average-over-rounds-played · zero-state · single-player · `stdDev` with `roundsPlayed < 2` · both rank preferences · every tiebreaker.
- **Position colours (required):** 3-or-fewer active players → nobody red · 4 players → 4th red · 6 players → 4th/5th neutral, 6th red · shared last → all red · DNF excluded from the last-place calculation · DNF beats every other token · zero-state → all neutral.
- **Manual smoke:** signup → create match → add player → submit 3 rounds → verify leaderboard order, totals, gaps, and the Interval/Leader flip.
- **Two-client:** two browsers in the same match; score entered in A appears in B within 5s.
- **Mobile:** 375px viewport. No horizontal page scroll. Scoreboard scrolls only inside its container. Tap targets ≥44px.
- **Themes:** every screen in light and dark; check position-colour contrast in both.

---

## 16. Error protocol

If something breaks: try to understand and fix it, up to **two** genuine attempts. If it still fails, **do not loop on it** — append to `errors.md` in the project root and move on to work that isn't blocked by it.

```markdown
## <short title>
- **Where:** file / route / component
- **What I expected:** …
- **What happened:** exact error text
- **Reproduce:** the precise command or click path
- **Tried:** attempt 1 → result · attempt 2 → result
- **Blocking:** yes/no — what's blocked
```

Only stop the whole build if the failure blocks everything downstream. When asked to "fix the errors", read `errors.md`, fix each entry, then delete the file.

## Ambiguity

If something truly isn't covered here: pick the simplest option consistent with the decisions above, implement it, and add a short note under a `## Decisions I made` heading in `errors.md`. Do not stall, and do not invent features that aren't specified.

---

## 17. Definition of done

- [ ] Signup with live username availability; login; logout; 4-field password recovery with rate limiting
- [ ] Dashboard: self stats · Friends/Find tabs · incoming requests · **Your Matches** · Join/Create actions
- [ ] Create match: name, role, rank preference, reorderable tiebreakers, exact-match player add
- [ ] Scoreboard: Total row, per-round rows, stable columns, position-tinted headers, `—` for blanks, sticky header and S.no, scrolls only inside its container
- [ ] Leaderboard: correct ranking, tiebreaker cascade, shared positions, DNF pinned last with real position number
- [ ] Position colours: purple/green/yellow fixed for 1st–3rd, **red only on the current last active player**, neutral for everything between, grey for DNF
- [ ] **Gap column alternates INTERVAL ↔ LEADER every 5s with a clean crossfade and a matching header label, all rows in unison**
- [ ] Creator-only round entry, ordered by current leaderboard position with colour chips, atomic submit, round editing with audit history
- [ ] DNF mark and rejoin; mid-match add; late joiners get blank cells and average over rounds played
- [ ] Join by name: fuzzy over friends' matches, exact globally, approval required
- [ ] Share link: 15-min expiry, unlimited use in-window, revocable, joins without approval
- [ ] Notifications for all seven events, polled
- [ ] Profile: stats + medals with won/leading counts; editable name/phone/DOB
- [ ] Live updates visible across two clients within 5s; polling pauses when the tab is hidden
- [ ] Offline banner + cached last-known scores; writes disabled offline
- [ ] Installable PWA, standalone display, correct icons on Android and iOS
- [ ] Clean at 375px; dark and light both pass contrast
- [ ] `tsc --noEmit`, `lint`, `build`, and `test` all pass
- [ ] `lib/domain/` is pure and fully unit-tested; no arithmetic in any `.tsx`
