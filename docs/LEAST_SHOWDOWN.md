# Least Showdown — house rules

Least Showdown is a quick-fire lowest-total game. Keep your hand as small as you can and
call **Show** when you think nobody can beat you. Lowest cumulative score at the end of the
match wins. (This used to be called *Least Count - 2* in the app.)

## Notation used here

Cards are written as rank followed by suit symbol: `♠` spades, `♥` hearts, `♣` clubs,
`♦` diamonds. So `Q♠` is the queen of spades and `7♥` the seven of hearts.

## Setup

- **Deal:** each player gets **7 cards**.
- **Open joker:** one card is placed face up for everyone to see. Every card of that rank
  becomes a **joker** for the round. If the open joker is `8♦`, all four 8s are jokers.
- **Decks:** the rest of the cards form the closed deck, face down. Discarded cards go on
  the open pile, face up; the top card of the open pile is the **open card**.

## Card values

| Card | Points |
| --- | --- |
| A | 1 |
| 2–10 | face value |
| J, Q, K | 10 each |
| Joker (printed, or any card of the open joker's rank) | 0 |

Example with `8♦` as the open joker: three 8s left in hand total **0**. Two 8s and two 4s
total **8**.

## A turn

On your turn you do exactly one of these:

1. **Declare Show** — see [Showdown](#showdown). You must do this *before* putting any card
   down.
2. **Put down, then pick.** Put down one card (or one allowed set, below), then pick one
   card: either the open card, or the top card of the closed deck.

You always put down first and pick second. For example, if the open card is `3` and you
hold a King, you can put the King down and take the `3`. If you don't want the open card,
you still put the King down and take the top card of the closed deck instead.

### Matching the open card

If what you put down is the **same rank as the open card**, your turn ends straight away —
you don't pick anything. If Harsh puts a Queen down and Vinay, playing next, also has a
Queen, Vinay puts it on top and his turn is over without picking.

If you don't have a card matching the open card, you put down any card (or set) and pick
as usual.

## Putting down several cards at once

- **Three of a kind:** three Js, three Qs or three Ks can go down together. Only J, Q and K
  — three 10s cannot. If they match the open card's rank (three Qs on an open Q), you don't
  pick.
- **Sequence:** three cards in a row of the **same suit**, such as `7♦ 8♦ 9♦`, can go
  down together. If the open card matches the sequence — `7♦ 8♦ 9♦` onto an open 7 — you
  don't pick.
- **Identical pair:** when more than one deck is in play, the same card can turn up
  twice — two `9♦`, for example. If you hold both, you can put them down together and
  shed both at once.
- When a set goes down, only its **top card** can be picked by the next player. If someone
  puts down `A 2 3`, the next player may take the `3` (putting a card of their own down
  first), but not the `2` or the `A`.

## Special cards

- **J — skip.** Putting down a J skips the next player's turn. Three Js at once, or an
  identical pair like two `J♦`, still skip only one player for that turn — you just shed
  more points.
- **7♥ — pick two.** When the 7 of hearts goes down, the next player must take **two cards
  from the closed deck** and their turn is skipped. Nobody can ever pick up the 7♥ — not
  the next player, not the one after. It can be put down but never picked up. The player
  after can still match it with another 7 to end their turn. Putting down two `7♥`
  together (an identical pair) still makes the next player take only **two** cards, not
  four.
- **Sequences follow their top card.** A sequence ending in `7♥` (`5♥ 6♥ 7♥`) works like
  the 7♥: the next player picks two and is skipped. A sequence where the 7♥ is not on top
  (`6♥ 7♥ 8♥`) does nothing special. Likewise `9 10 J` skips the next player, but
  `10 J Q` and `J Q K` do not.
- **Jokers can be picked.** If someone puts down a joker, the next player may pick it up.

## Showdown

- You may only declare Show **at the start of your own turn**, before putting any card
  down. If you put a card down, you must pick and play carries on.
- Everyone then reveals and adds up their hand.

**Correct show:** your total is **strictly lower** than every other player's. You score
**0** for the round; everyone else scores their own card total.

**Wrong show:** anyone has the **same or a lower** total than you. The round stops there:

- You score your card total **plus 50**.
- Everyone else scores their own card total. Nobody gets 0 for the show.
- A tie counts against you. If you show with 0 and someone else also has 0, it is still a
  wrong show and you take +50.

Example: Harsh shows with 8 and Vinay also has 8. Harsh scores 58, Vinay scores 8.

## Scoring in the app

Enter every player's card total for the round. Tap **+50 wrong show** on the player who
called a wrong show; the app adds the 50 for you and keeps count. The match scorecard
tracks each player's correct shows, wrong shows and the times they beat someone's show.

## Winning the match

The player with the **lowest cumulative score** when the match ends wins.
