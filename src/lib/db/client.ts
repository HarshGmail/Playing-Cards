import { MongoClient, Db, ClientSession } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is not set');

const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10000,
};

// Next.js reloads route modules independently of each other (dev HMR, and
// warm serverless instances in prod), so a plain module-level variable
// doesn't reliably survive that — it can spin up a new MongoClient per
// reload. Caching the connect() promise on `global` survives it. See:
// https://www.mongodb.com/docs/drivers/node/current/connect/connection-guide/#reuse-your-client
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const TLS_TRUST_ERROR_CODES = new Set([
  'SELF_SIGNED_CERT_IN_CHAIN',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'CERT_UNTRUSTED',
]);

const TLS_TRUST_ERROR_TEXT = [
  'self-signed certificate',
  'self signed certificate',
  'unable to verify the first certificate',
  'unable to get local issuer certificate',
];

/**
 * A TLS *trust* failure is deterministic: an intercepting proxy re-signs the
 * next handshake exactly the way it signed the last one. Retrying can't help,
 * it just multiplies the wait — 5 attempts x a 10s selection timeout is nearly
 * a minute before the request finally 500s. Detect it and bail immediately.
 */
function isTlsTrustError(err: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = err;

  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    const e = current as { code?: unknown; message?: unknown; cause?: unknown; reason?: unknown };

    if (typeof e.code === 'string' && TLS_TRUST_ERROR_CODES.has(e.code)) return true;
    if (
      typeof e.message === 'string' &&
      TLS_TRUST_ERROR_TEXT.some((t) => (e.message as string).toLowerCase().includes(t))
    ) {
      return true;
    }

    current = e.cause ?? e.reason;
  }

  return false;
}

class MongoTlsTrustError extends Error {
  // Declared explicitly: the configured lib target predates Error.cause.
  readonly cause: unknown;

  constructor(cause: unknown) {
    super(
      'MongoDB TLS handshake rejected: the certificate chain is signed by a root ' +
        'CA that Node does not trust — typically a TLS-intercepting corporate ' +
        'proxy or VPN. Node ignores the OS trust store by default. Start the app ' +
        'with `npm run dev` (which enables system-CA trust), or set ' +
        'NODE_EXTRA_CA_CERTS to your proxy root CA before Node boots. ' +
        'Note this is a certificate-trust failure, not a network or Atlas IP ' +
        'access-list problem.'
    );
    this.name = 'MongoTlsTrustError';
    this.cause = cause;
  }
}

// On a network where the TLS handshake to Atlas fails *intermittently*
// (e.g. a security agent interfering with non-HTTP TLS), a single connect()
// attempt has a real chance of failing even though the server is fine. Retry a
// few times before giving up — but only for errors that retrying can fix.
async function connectWithRetry(attempts = 5): Promise<MongoClient> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await new MongoClient(uri!, options).connect();
    } catch (err) {
      if (isTlsTrustError(err)) throw new MongoTlsTrustError(err);
      lastError = err;
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300 * (i + 1)));
      }
    }
  }
  throw lastError;
}

function getClientPromise(): Promise<MongoClient> {
  if (global._mongoClientPromise) return global._mongoClientPromise;

  const promise = connectWithRetry().catch((err) => {
    // Don't leave a permanently-rejected promise cached — the next call
    // should get a fresh retry sequence, not an instant repeat failure.
    global._mongoClientPromise = undefined;
    throw err;
  });

  global._mongoClientPromise = promise;
  return promise;
}

export async function getMongoClient(): Promise<MongoClient> {
  return getClientPromise();
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db();
}

export async function withTransaction<T>(
  fn: (session: ClientSession) => Promise<T>
): Promise<T> {
  const client = await getMongoClient();
  const session = client.startSession();
  try {
    let result: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result!;
  } finally {
    await session.endSession();
  }
}

export async function closeMongoConnection(): Promise<void> {
  if (!global._mongoClientPromise) return;
  const client = await global._mongoClientPromise.catch(() => null);
  if (client) await client.close();
  global._mongoClientPromise = undefined;
}
