import { NextRequest } from 'next/server';
import { ZodSchema } from 'zod';
import { rateLimit } from '@/lib/auth/rateLimit';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { validationError, error } from './respond';

interface HandlerOptions {
  rateLimitKey?: string;
  maxAttempts?: number;
  windowMs?: number;
  schema?: ZodSchema;
  requireAuth?: boolean;
}

const DEFAULT_RATE_LIMIT = {
  key: 'api',
  maxAttempts: 100,
  windowMs: 60 * 1000,
};

export function createHandler<T>(
  handler: (
    req: NextRequest,
    data: T | null,
    userId: string | null,
    requestId: string
  ) => Promise<Response>,
  options: HandlerOptions = {}
) {
  return async (req: NextRequest) => {
    const requestId = crypto.randomUUID?.() || Date.now().toString();
    const startTime = Date.now();
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const userId = req.headers.get('x-user-id');

    try {
      // Auth check
      if (options.requireAuth && !userId) {
        logApiResponse(requestId, 401, Date.now() - startTime);
        return error('Unauthorized', 'UNAUTHORIZED', 401);
      }

      // Rate limiting
      if (options.rateLimitKey) {
        const limit = rateLimit(
          options.rateLimitKey,
          ip,
          options.maxAttempts ?? DEFAULT_RATE_LIMIT.maxAttempts,
          options.windowMs ?? DEFAULT_RATE_LIMIT.windowMs
        );

        if (!limit.allowed) {
          logApiResponse(requestId, 429, Date.now() - startTime);
          return error('Too many requests. Try again later.', 'RATE_LIMITED', 429);
        }
      }

      // Parse body and validate
      let data: T | null = null;
      if (options.schema) {
        let body: unknown;
        try {
          body = await req.json();
        } catch {
          logApiResponse(requestId, 400, Date.now() - startTime);
          return validationError('Invalid JSON');
        }

        const parsed = options.schema.safeParse(body);
        if (!parsed.success) {
          logApiResponse(requestId, 400, Date.now() - startTime);
          return validationError(parsed.error.issues[0]?.message || 'Invalid input');
        }
        data = parsed.data as T;
      }

      logApiRequest(requestId, req.nextUrl.pathname, userId);

      // Call handler
      const response = await handler(req, data, userId, requestId);
      logApiResponse(requestId, response.status, Date.now() - startTime);
      return response;
    } catch (err) {
      logError(requestId, err);
      logApiResponse(requestId, 500, Date.now() - startTime);
      return error('Internal server error', 'INTERNAL_ERROR', 500);
    }
  };
}

export type ValidatedRequest<T> = {
  data: T;
  userId: string | null;
  requestId: string;
};
