import * as winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';

const isDev = process.env.NODE_ENV === 'development';

const redactedKeys = ['password', 'passwordHash', 'token', 'jwt', 'cookie'];

function redactSensitive(data: Record<string, unknown>): Record<string, unknown> {
  const result = { ...data };
  for (const key of redactedKeys) {
    if (key in result) result[key] = '[REDACTED]';
  }
  return result;
}

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
  }),
];

if (isDev) {
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
  }

  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
    })
  );
}

export const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  transports,
  exceptionHandlers: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
  ],
});

export function logApiRequest(
  requestId: string,
  route: string,
  userId?: string | null,
  params?: Record<string, unknown>
) {
  logger.info('api.request', {
    requestId,
    route,
    userId: userId || null,
    ...redactSensitive(params || {}),
  });
}

export function logApiResponse(
  requestId: string,
  status: number,
  durationMs: number
) {
  logger.info('api.response', {
    requestId,
    status,
    durationMs,
  });
}

export function logError(requestId: string, error: unknown, context?: Record<string, unknown>) {
  logger.error('api.error', {
    requestId,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  });
}
