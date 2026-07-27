import { z } from 'zod';

export const sendFriendRequestSchema = z.object({
  toUserId: z.string(),
});

export const respondToFriendRequestSchema = z.object({
  action: z.enum(['accept', 'decline']),
});

export const searchUsersSchema = z.object({
  query: z.string().min(1).max(50),
  // Coerced because the search endpoint reads this off the query string,
  // where every value arrives as a string.
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export type SendFriendRequestInput = z.infer<typeof sendFriendRequestSchema>;
export type RespondToFriendRequestInput = z.infer<typeof respondToFriendRequestSchema>;
export type SearchUsersInput = z.infer<typeof searchUsersSchema>;
