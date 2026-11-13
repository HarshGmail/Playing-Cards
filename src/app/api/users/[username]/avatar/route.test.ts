import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

interface StoredUser {
  _id: ObjectId;
  name: string;
  username: string;
  profilePicUrl: string | null;
}

const MODERATOR: StoredUser = {
  _id: new ObjectId(),
  name: 'Harsh Vardhan',
  username: 'destructor_harsh',
  profilePicUrl: null,
};
const PLAYER: StoredUser = {
  _id: new ObjectId(),
  name: 'Asha',
  username: 'asha',
  profilePicUrl: 'https://res.cloudinary.com/demo/image/upload/v1/avatars/asha.jpg',
};
const OTHER_PLAYER: StoredUser = {
  _id: new ObjectId(),
  name: 'Ravi',
  username: 'ravi',
  profilePicUrl: 'https://res.cloudinary.com/demo/image/upload/v1/avatars/ravi.jpg',
};

let storedUsers: StoredUser[] = [];
const removeProfilePic = vi.fn();
const notifyUser = vi.fn();

vi.mock('@/lib/auth/jwt', () => ({
  verifyJwt: async () => null,
}));

vi.mock('@/lib/db/collections', () => ({
  getUsers: async () => ({
    findOne: async (filter: { _id?: ObjectId; username?: string }) =>
      storedUsers.find((user) =>
        filter._id ? user._id.equals(filter._id) : user.username === filter.username
      ) ?? null,
  }),
}));

vi.mock('@/lib/users/removeProfilePic', () => ({
  removeProfilePic: (userId: string) => removeProfilePic(userId),
}));

vi.mock('@/lib/notifications/create', () => ({
  notifyUser: (userId: string, type: string, payload: unknown) => notifyUser(userId, type, payload),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn() },
  logApiRequest: vi.fn(),
  logApiResponse: vi.fn(),
  logError: vi.fn(),
}));

const { DELETE } = await import('./route');

function removeAvatarAs(requester: StoredUser | null, targetUsername: string) {
  const headers: Record<string, string> = {};
  if (requester) headers['x-user-id'] = requester._id.toString();
  const request = new NextRequest(`https://app.test/api/users/${targetUsername}/avatar`, {
    method: 'DELETE',
    headers,
  });
  return DELETE(request, { params: { username: targetUsername } });
}

describe('DELETE /api/users/[username]/avatar', () => {
  beforeEach(() => {
    storedUsers = [MODERATOR, PLAYER, OTHER_PLAYER].map((user) => ({ ...user }));
    removeProfilePic.mockReset();
    removeProfilePic.mockResolvedValue({});
    notifyUser.mockReset();
    notifyUser.mockResolvedValue(undefined);
  });

  it('answers 401 when nobody is signed in', async () => {
    const response = await removeAvatarAs(null, PLAYER.username);

    expect(response.status).toBe(401);
    expect(removeProfilePic).not.toHaveBeenCalled();
  });

  it("refuses a regular player removing someone else's photo", async () => {
    const response = await removeAvatarAs(OTHER_PLAYER, PLAYER.username);

    expect(response.status).toBe(403);
    expect(removeProfilePic).not.toHaveBeenCalled();
    expect(notifyUser).not.toHaveBeenCalled();
  });

  it('refuses a signed-in session whose account no longer exists', async () => {
    const ghost = { ...OTHER_PLAYER, _id: new ObjectId() };

    const response = await removeAvatarAs(ghost, PLAYER.username);

    expect(response.status).toBe(403);
    expect(removeProfilePic).not.toHaveBeenCalled();
  });

  it("lets the moderator remove a player's photo and tells the player", async () => {
    const response = await removeAvatarAs(MODERATOR, PLAYER.username);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.removed).toBe(true);
    expect(body.user).toMatchObject({ username: PLAYER.username, profilePicUrl: null });
    expect(removeProfilePic).toHaveBeenCalledWith(PLAYER._id.toString());
    expect(notifyUser).toHaveBeenCalledWith(PLAYER._id.toString(), 'avatar-removed', {});
  });

  it('still succeeds when the notification fails to send', async () => {
    notifyUser.mockRejectedValue(new Error('push down'));

    const response = await removeAvatarAs(MODERATOR, PLAYER.username);

    expect(response.status).toBe(200);
    expect(removeProfilePic).toHaveBeenCalled();
  });

  it('answers 404 for an unknown username', async () => {
    const response = await removeAvatarAs(MODERATOR, 'nobody_here');

    expect(response.status).toBe(404);
    expect(removeProfilePic).not.toHaveBeenCalled();
  });

  it('does nothing and sends no notification when the player has no photo', async () => {
    storedUsers = storedUsers.map((user) =>
      user.username === PLAYER.username ? { ...user, profilePicUrl: null } : user
    );

    const response = await removeAvatarAs(MODERATOR, PLAYER.username);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.removed).toBe(false);
    expect(removeProfilePic).not.toHaveBeenCalled();
    expect(notifyUser).not.toHaveBeenCalled();
  });
});
