import dns from 'node:dns';
import { execFileSync } from 'node:child_process';

const LOOPBACK_PREFIXES = ['127.', '::1'];

function isLoopback(server) {
  return LOOPBACK_PREFIXES.some((prefix) => server.startsWith(prefix));
}

function macResolvers() {
  try {
    const output = execFileSync('scutil', ['--dns'], { encoding: 'utf8' });
    const servers = [...output.matchAll(/nameserver\[\d+\]\s*:\s*(\S+)/g)].map((m) => m[1]);
    return [...new Set(servers)].filter((server) => server.includes('.'));
  } catch {
    return [];
  }
}

const usingOnlyLoopback = dns.getServers().every(isLoopback);
const resolvers = usingOnlyLoopback && process.platform === 'darwin' ? macResolvers() : [];

if (resolvers.length > 0) dns.setServers(resolvers);
