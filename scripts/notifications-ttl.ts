import { getNotifications } from '../src/lib/db/collections';
import { DEFAULT_NOTIFICATION_TTL_MS } from '../src/lib/notifications/create';

async function main(): Promise<void> {
  const notificationsCol = await getNotifications();

  const missingExpiry = { $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }] };
  const missingBefore = await notificationsCol.countDocuments(missingExpiry);

  const result = await notificationsCol.updateMany(missingExpiry, [
    {
      $set: {
        expiresAt: { $add: ['$createdAt', DEFAULT_NOTIFICATION_TTL_MS] },
      },
    },
  ]);

  const indexName = await notificationsCol.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
  );

  const missingAfter = await notificationsCol.countDocuments(missingExpiry);
  const total = await notificationsCol.countDocuments({});

  console.log(
    JSON.stringify({
      total,
      missingBefore,
      modified: result.modifiedCount,
      missingAfter,
      ttlIndex: indexName,
    })
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
