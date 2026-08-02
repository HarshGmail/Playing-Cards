import { getUsers, User } from '@/lib/db/collections';
import { success, error } from '@/lib/api/respond';
import { createHandler } from '@/lib/api/handler';
import { uploadAvatar, deleteAvatar } from '@/lib/storage/cloudinary';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

/**
 * 4MB. Vercel caps a serverless function's request body at ~4.5MB, so anything
 * above this is rejected by the platform with an opaque 413 before our handler
 * runs. Staying under it lets us return a readable error instead.
 */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/**
 * `file.type` is set by the browser from the file extension, so a renamed .txt
 * arrives claiming to be image/jpeg. Checking the leading bytes is what actually
 * establishes the format.
 */
function sniffImageType(bytes: Uint8Array): 'jpeg' | 'png' | 'webp' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }

  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && PNG.every((b, i) => bytes[i] === b)) {
    return 'png';
  }

  // WebP is a RIFF container: "RIFF" <4-byte size> "WEBP".
  const ascii = (offset: number, text: string) =>
    [...text].every((ch, i) => bytes[offset + i] === ch.charCodeAt(0));
  if (bytes.length >= 12 && ascii(0, 'RIFF') && ascii(8, 'WEBP')) {
    return 'webp';
  }

  return null;
}

function serializeUser(user: User) {
  return {
    id: user._id?.toString(),
    name: user.name,
    username: user.username,
    email: user.email,
    phone: user.phone,
    dob: user.dob,
    profilePicUrl: user.profilePicUrl,
    updatedAt: user.updatedAt,
  };
}

async function setProfilePicUrl(userId: string, url: string | null) {
  const usersCol = await getUsers();
  return usersCol.findOneAndUpdate(
    { _id: new ObjectId(userId) },
    { $set: { profilePicUrl: url, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
}

/**
 * POST /api/users/me/avatar
 * multipart/form-data with a single `file` field.
 *
 * Deliberately declared without a `schema`: createHandler consumes the body via
 * req.json() when one is present, which would leave nothing to read as form
 * data. We still get auth, rate limiting and logging from it.
 */
export const POST = createHandler(
  async (req, _data, userId) => {
    if (!userId) {
      return error('Unauthorized', 'UNAUTHORIZED', 401);
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return error('Expected multipart/form-data', 'VALIDATION_ERROR', 400);
    }

    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return error('No file uploaded', 'VALIDATION_ERROR', 400);
    }

    if (file.size === 0) {
      return error('The uploaded file is empty', 'VALIDATION_ERROR', 400);
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return error('Image must be 4MB or smaller', 'VALIDATION_ERROR', 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (!sniffImageType(buffer)) {
      return error('Image must be a JPEG, PNG or WebP file', 'VALIDATION_ERROR', 400);
    }

    // userId comes from the middleware-verified JWT, never from the request
    // body, so a caller can only ever overwrite their own avatar.
    const secureUrl = await uploadAvatar(userId, buffer);

    const result = await setProfilePicUrl(userId, secureUrl);
    if (!result) {
      return error('User not found', 'USER_NOT_FOUND', 404);
    }

    return success({ user: serializeUser(result as User) });
  },
  {
    rateLimitKey: 'upload-avatar',
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000,
    requireAuth: true,
  }
);

/** DELETE /api/users/me/avatar — clears the picture and removes the stored file. */
export const DELETE = createHandler(
  async (_req, _data, userId) => {
    if (!userId) {
      return error('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const result = await setProfilePicUrl(userId, null);
    if (!result) {
      return error('User not found', 'USER_NOT_FOUND', 404);
    }

    // After the document is updated, so a Cloudinary failure can't leave the
    // user pointing at an asset we already deleted.
    await deleteAvatar(userId);

    return success({ user: serializeUser(result as User) });
  },
  {
    rateLimitKey: 'delete-avatar',
    maxAttempts: 20,
    windowMs: 60 * 60 * 1000,
    requireAuth: true,
  }
);
