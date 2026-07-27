import { MongoClient, Db } from 'mongodb';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (cachedClient) return cachedClient;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  const options = {
    tlsInsecure: process.env.NODE_ENV === 'development',
    retryWrites: false,
  };

  cachedClient = new MongoClient(uri, options);
  await cachedClient.connect();

  return cachedClient;
}

export async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;

  const client = await getMongoClient();
  cachedDb = client.db();

  return cachedDb;
}

export async function closeMongoConnection(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
  }
}
