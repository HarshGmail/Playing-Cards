import { NextResponse } from 'next/server';

export function success<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, code: string, status = 400) {
  return NextResponse.json({ error: message, code }, { status });
}

export function unauthorized() {
  return error('Unauthorized', 'UNAUTHORIZED', 401);
}

export function forbidden() {
  return error('Forbidden', 'FORBIDDEN', 403);
}

export function notFound() {
  return error('Not found', 'NOT_FOUND', 404);
}

export function conflict(message: string) {
  return error(message, 'CONFLICT', 409);
}

export function validationError(message: string) {
  return error(message, 'VALIDATION_ERROR', 400);
}
