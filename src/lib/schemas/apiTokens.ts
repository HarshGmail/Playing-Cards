import { z } from 'zod';

export const MAX_API_TOKEN_NAME_LENGTH = 50;
export const MAX_API_TOKENS_PER_USER = 5;

export const createApiTokenSchema = z.object({
  name: z.string().trim().min(1).max(MAX_API_TOKEN_NAME_LENGTH),
});

export type CreateApiTokenInput = z.infer<typeof createApiTokenSchema>;
