import { z } from 'zod';

export const MAX_TARGET_ROUNDS = 20;
const targetRoundsSchema = z.number().int().min(1).max(MAX_TARGET_ROUNDS).nullable();

export const createMatchSchema = z
  .object({
    name: z.string().min(3).max(50),
    creatorRole: z.enum(['score-only', 'score-and-play']),
    rankPreference: z.enum(['highest-first', 'lowest-first']),
    // Optional with a default so any older client that omits it still creates a
    // valid match. See DEFAULT_GAME_TYPE in lib/games/catalog.ts.
    gameType: z.enum(['least-count', 'other']).optional().default('least-count'),
    /** Free-text name for gameType 'other'; ignored for known games. */
    gameLabel: z.string().trim().max(50).optional(),
    tiebreakers: z.array(z.string()).length(3),
    players: z.array(z.string()).min(1),
    spectatorIds: z.array(z.string()).optional().default([]),
    targetRounds: targetRoundsSchema.optional().default(null),
  })
  .transform((data) => ({
    ...data,
    // A label only means anything for 'other'. Normalising here keeps every
    // consumer from having to special-case an empty string.
    gameLabel:
      data.gameType === 'other' && data.gameLabel ? data.gameLabel : null,
  }));

export const updateMatchSettingsSchema = z
  .object({
    name: z.string().trim().min(3).max(50),
    rankPreference: z.enum(['highest-first', 'lowest-first']),
    gameType: z.enum(['least-count', 'other']),
    gameLabel: z.string().trim().max(50).optional(),
    targetRounds: targetRoundsSchema.optional().default(null),
  })
  .refine((data) => data.gameType !== 'other' || !!data.gameLabel, {
    message: 'Name the game you are playing',
    path: ['gameLabel'],
  })
  .transform((data) => ({
    ...data,
    gameLabel: data.gameType === 'other' && data.gameLabel ? data.gameLabel : null,
  }));

export const submitRoundSchema = z.object({
  scores: z.array(
    z.object({
      playerId: z.string(),
      value: z.number().int().min(0).max(99999),
    })
  ),
});

export const updateRoundSchema = z.object({
  scores: z
    .array(
      z.object({
        playerId: z.string(),
        value: z.number().int().min(0).max(99999),
      })
    )
    .min(1, 'At least one player must have a score'),
  dnfPlayerIds: z.array(z.string()).optional().default([]),
});

export type CreateMatchInput = z.infer<typeof createMatchSchema>;
export type UpdateMatchSettingsInput = z.infer<typeof updateMatchSettingsSchema>;
export type SubmitRoundInput = z.infer<typeof submitRoundSchema>;
export type UpdateRoundInput = z.infer<typeof updateRoundSchema>;
