import { createHash, randomBytes } from 'crypto';
import { ObjectId } from 'mongodb';
import { ApiToken, getApiTokens } from '@/lib/db/collections';
import { MAX_API_TOKENS_PER_USER } from '@/lib/schemas/apiTokens';

export const API_TOKEN_PREFIX = 'pc_';
const TOKEN_RANDOM_BYTES = 32;
const DISPLAY_PREFIX_LENGTH = 8;

export interface ApiTokenRecord {
  id: string;
  name: string;
  prefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export function generateApiToken(): string {
  return API_TOKEN_PREFIX + randomBytes(TOKEN_RANDOM_BYTES).toString('base64url');
}

export function hashApiToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function toRecord(token: ApiToken & { _id: { toString(): string } }): ApiTokenRecord {
  return {
    id: token._id.toString(),
    name: token.name,
    prefix: token.prefix,
    createdAt: token.createdAt,
    lastUsedAt: token.lastUsedAt,
  };
}

export async function countApiTokens(userId: string): Promise<number> {
  const tokens = await getApiTokens();
  return tokens.countDocuments({ userId });
}

export async function listApiTokens(userId: string): Promise<ApiTokenRecord[]> {
  const tokens = await getApiTokens();
  const docs = await tokens
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map((doc) => toRecord(doc as ApiToken & { _id: { toString(): string } }));
}

export async function createApiToken(
  userId: string,
  name: string
): Promise<{ token: string; record: ApiTokenRecord }> {
  const token = generateApiToken();
  const createdAt = new Date();
  const tokens = await getApiTokens();
  const result = await tokens.insertOne({
    userId,
    name,
    tokenHash: hashApiToken(token),
    prefix: token.slice(0, DISPLAY_PREFIX_LENGTH),
    createdAt,
    lastUsedAt: null,
  });

  return {
    token,
    record: {
      id: result.insertedId.toString(),
      name,
      prefix: token.slice(0, DISPLAY_PREFIX_LENGTH),
      createdAt,
      lastUsedAt: null,
    },
  };
}

export async function revokeApiToken(userId: string, tokenId: string): Promise<boolean> {
  if (!ObjectId.isValid(tokenId)) return false;
  const tokens = await getApiTokens();
  const result = await tokens.deleteOne({ _id: new ObjectId(tokenId), userId });
  return result.deletedCount === 1;
}

export async function findUserIdForApiToken(token: string): Promise<string | null> {
  if (!token.startsWith(API_TOKEN_PREFIX)) return null;
  const tokens = await getApiTokens();
  const updated = await tokens.findOneAndUpdate(
    { tokenHash: hashApiToken(token) },
    { $set: { lastUsedAt: new Date() } },
    { returnDocument: 'after', projection: { userId: 1 } }
  );
  return updated?.userId ?? null;
}
