#!/usr/bin/env node
/**
 * Runs a Next.js command with the machine's own TLS trust store honoured.
 *
 * Why this exists:
 * On a network with a TLS-intercepting proxy (corporate VPN / security agent),
 * every outbound TLS connection — including the one to MongoDB Atlas — is
 * re-signed by an internal root CA. The OS trusts that CA, but Node ships its
 * own bundled CA list and ignores the system trust store *unless* it is started
 * with --use-system-ca. Without the flag the MongoDB driver rejects the
 * handshake with "self-signed certificate in certificate chain".
 *
 * The flag is opt-in, so pinning Node 24 in .nvmrc is not sufficient on its own
 * — it grants the capability, not the behaviour. And because Node builds its TLS
 * root store during process startup, the flag can't be applied from .env.local
 * (Next reads that long after boot) or from application code. It has to be in
 * place before Node starts, which is what this wrapper does.
 *
 * Off such a network the flag is harmless: it adds the OS roots to Node's own,
 * so normal public certificates keep validating exactly as before.
 *
 * Requires Node >= 22.15 for --use-system-ca; .nvmrc pins 24.
 */

const { spawn } = require('child_process');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('usage: with-corp-ca.cjs <next-subcommand> [...args]');
  process.exit(1);
}

// Spawn `node <next-bin>` rather than the `next` shim so there is no shell
// quoting to get wrong and no PATH lookup to fail on Windows. Passing the flag
// as a node argument also avoids clobbering an inherited NODE_OPTIONS.
const child = spawn(
  process.execPath,
  ['--use-system-ca', require.resolve('next/dist/bin/next'), ...args],
  { stdio: 'inherit' }
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on('error', (err) => {
  console.error('[with-corp-ca] failed to start next:', err.message);
  process.exit(1);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => child.kill(sig));
}
