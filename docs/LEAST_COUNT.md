# Least Count — house rules

The scoring game this app tracks. Mechanically this is an Indian 13-card rummy variant
with a hidden wild-card reveal (the *tiplu*), from the same family as Marriage / Nepali
rummy. The group calls it "Least Count" because the lowest cumulative score wins; note
that the game commonly published under the name *Least Count* is a different, simpler
game, so don't trust rules you find online under that name.

## Notation used here

Cards are written as rank followed by suit symbol: `♠` spades, `♥` hearts, `♣` clubs,
`♦` diamonds. So `Q♠` is the queen of spades and `7♦` the seven of diamonds.

## Setup

- **Cards:** two standard decks shuffled together, printed Jokers removed — **104 cards**.
  Every rank/suit combination therefore exists twice.
- **Players:** 3–4.
- **Deal:** 13 cards to each player.
- **Open pile:** one card is turned face up. This starts the discard pile.
- **The tiplu:** one card is placed **face down and crosswise underneath the closed
  deck**, so it is visibly distinguishable and cannot be drawn by accident. Nobody may
  look at it yet. Its rank will later become wild.

## Card values

| Card | Points |
| --- | --- |
| A, J, Q, K | 10 each |
| 2–10 | face value |

The Ace is worth 10 points but is rank-flexible in sequences (see below).

## A turn

On your turn you **draw exactly one card, then discard exactly one card**. Hand size is
unchanged by a turn.

Draw from either:

- **the open pile** — the top card, which everyone has seen; or
- **the closed deck** — the top card, which only you see.

Then discard one card face up onto the open pile. If you drew blind from the closed deck
and don't want the card, discarding that same card is a normal, legal turn.

Because discards are public, **the whole table knows when you pick up someone's discard**.
That is the main source of read-your-opponent information in this game.

## The 4-card pure sequence

The gate to everything else. It is **four cards of the same suit in consecutive rank**,
with no wild (impossible to use one anyway — at this stage nobody knows the wild rank).

- `A♥ 2♥ 3♥ 4♥` — valid (Ace low)
- `J♠ Q♠ K♠ A♠` — valid (Ace high)
- `Q♣ K♣ A♣ 2♣` — **invalid**, the Ace does not wrap around
- `4♥ 5♥ 6♥ 7♣` — invalid, suits must match

When you hold one, on your turn, in this order:

1. Draw, as normal.
2. **Lay the four cards face up on the table** for everyone to see. This is mandatory —
   you don't get to sit on it. They are locked there for the rest of the round.
3. Discard, as normal.
4. **Only now** may you slide out the tiplu, look at it **in secret**, and put it back
   face down. You must not tell anyone its rank.

You are now playing with 9 cards in hand.

## The wild rank

Whatever rank the tiplu is, **every card of that rank is wild** and may stand in for any
card you like — any rank, any suit. The tiplu itself stays under the deck; the other
seven copies of that rank are in play.

Example: the tiplu is `7♥`. Every 7 is now wild, so `J♥ 7♣ K♥` counts as a valid
hearts sequence, the `7♣` standing in for `Q♥`.

Only players who have laid a 4-card pure sequence know the wild rank. Everyone else is
holding wilds without knowing it — which is exactly why they get no credit for them at
scoring time.

## Declaring ("show")

You may declare once **all 13 of your cards are accounted for**:

- the **4-card pure sequence** already laid on the table, plus
- your **9 in-hand cards split into three groups of three**, where:
  - **at least one group must be a sequence** — this is compulsory;
  - the other two groups may each be a sequence *or* a set;
  - wilds may be used in any of the three groups, sequences and sets alike.

**Sequence** — three cards of the same suit in consecutive rank (`5♦ 6♦ 7♦`).

**Set** — three cards of the same rank in **three different suits** (`5♥ 5♣ 5♠`).
Two copies of the same card do not count as different suits: `5♥ 5♥ 5♣` is **not** a set,
because the two decks make duplicates possible and they are explicitly disallowed here.

To declare, say **"show"**, lay your hand down, and reveal the tiplu to the table. The
other players verify it. If it checks out you win and the round ends immediately.

## Scoring a round

Three cases.

**1. The winner scores 0.**

**2. A player who laid their 4-card pure sequence** (and therefore saw the tiplu) but
didn't get to declare scores **only the cards that aren't part of a valid group**. The
laid 4-sequence is free, and any valid 3-card sequence or set still in hand is free.

> Example: laid sequence on the table, one completed set and one completed sequence in
> hand, and three loose cards `5♥ 6♥ 5♦`. Score = 5 + 6 + 5 = **16**.

**3. A player who never laid a 4-card pure sequence scores the full face value of all 13
cards.** No credit for anything — not sequences, not sets, and wilds count at face value
since the player didn't know they were wild.

> Example: `Q♠ K♠ A♠ 3♠ 4♠ 6♣ 7♣ 8♣ 2♥ 2♥ 7♦ 5♦ 8♦`
> = 10 + 10 + 10 + 3 + 4 + 6 + 7 + 8 + 2 + 2 + 7 + 5 + 8 = **82**
>
> Note this hand contains both `6♣ 7♣ 8♣` and `Q♠ K♠ A♠` — two perfectly good sequences —
> and they earn nothing, because no 4-card pure sequence was laid. The gate is strict.

## Winning the match

Rounds are played as long as the group wants (typically ~12). Each round's scores are
added to a running total. **The lowest cumulative total wins the match** — hence
"least count". Ties are settled by the match's configured tiebreakers.

## How this maps to the app

- Create the match with **rank preference = lowest score wins** (`lowest-first`).
- Each round, enter every player's score for that round. The winner's entry is `0`.
- Scores are non-negative integers. A realistic ceiling is ~130 (thirteen 10-point cards).
- The leaderboard sorts by ascending total; "games won" counts rounds scored 0.

## Open house-rule questions

Not yet settled — decide these before building rule-aware features:

- **Invalid show.** What happens if a player declares and the hand doesn't check out? A
  penalty score, forced play-on, or an instant loss for the round?
- **Dropping.** Is there any way to fold early for a fixed penalty, or must every player
  play to the end of the round?
- **Leftover wilds.** A player who laid their sequence and holds an unused wild at
  scoring time — does it count at face value (10 if the tiplu is a King, etc.) or zero?
- **Running out of deck.** What if the closed deck is exhausted before anyone shows —
  reshuffle the discard pile, or end the round and score everyone?
