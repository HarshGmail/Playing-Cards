import { z } from 'zod';

export const createMatchSchema = z.object({
  name: z.string().min(3).max(50),
  creatorRole: z.enum(['score-only', 'score-and-play']),
  rankPreference: z.enum(['highest-first', 'lowest-first']),
  tiebreakers: z.array(z.string()).length(3),
  players: z.array(z.string()).min(1),
});

export const submitRoundSchema = z.object({
  scores: z.array(
    z.object({
      playerId: z.string(),
      value: z.number().int().min(0).max(99999),
    })
  ),
});

export const updateRoundSchema = z.object({
  scores: z.array(
    z.object({
      playerId: z.string(),
      value: z.number().int().min(0).max(99999),
    })
  ),
});

export type CreateMatchInput = z.infer<typeof createMatchSchema>;
export type SubmitRoundInput = z.infer<typeof submitRoundSchema>;
export type UpdateRoundInput = z.infer<typeof updateRoundSchema>;
