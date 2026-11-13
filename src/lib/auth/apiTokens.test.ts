import { describe, it, expect, vi, beforeEach } from 'vitest';

const findOneAndUpdate = vi.fn();

vi.mock('@/lib/db/collections', () => ({
  getApiTokens: async () => ({ findOneAndUpdate }),
}));

const { generateApiToken, hashApiToken, findUserIdForApiToken } = await import('./apiTokens');

describe('generateApiToken', () => {
  it('returns the pc_ prefix followed by 32 random bytes in base64url', () => {
    expect(generateApiToken()).toMatch(/^pc_[A-Za-z0-9_-]{43}$/);
  });

  it('never repeats', () => {
    expect(generateApiToken()).not.toBe(generateApiToken());
  });
});

describe('hashApiToken', () => {
  it('is a stable SHA-256 hex digest that does not contain the token', () => {
    const token = generateApiToken();
    const hash = hashApiToken(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe(hashApiToken(token));
    expect(hash).not.toContain(token);
  });
});

describe('findUserIdForApiToken', () => {
  beforeEach(() => findOneAndUpdate.mockReset());

  it('looks the token up by its hash and returns the owning user', async () => {
    findOneAndUpdate.mockResolvedValue({ userId: 'user-1' });
    const token = generateApiToken();

    await expect(findUserIdForApiToken(token)).resolves.toBe('user-1');

    const [filter, update] = findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ tokenHash: hashApiToken(token) });
    expect(JSON.stringify(filter)).not.toContain(token);
    expect(update.$set.lastUsedAt).toBeInstanceOf(Date);
  });

  it('returns null for a token that was never issued', async () => {
    findOneAndUpdate.mockResolvedValue(null);
    await expect(findUserIdForApiToken(generateApiToken())).resolves.toBeNull();
  });

  it('returns null once the token has been revoked, because revoking deletes it', async () => {
    findOneAndUpdate.mockResolvedValue(null);
    await expect(findUserIdForApiToken(generateApiToken())).resolves.toBeNull();
  });

  it('rejects anything without the pc_ prefix without touching the database', async () => {
    await expect(findUserIdForApiToken('not-a-token')).resolves.toBeNull();
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });
});
