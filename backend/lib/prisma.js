import { PrismaClient } from '@prisma/client';

export const DEFAULT_SERVERLESS_CONNECTION_LIMIT = 3;
export const DEFAULT_SERVERLESS_POOL_TIMEOUT_SECONDS = 10;

/**
 * Builds an optimized database URL for serverless/multi-instance workloads:
 * - connection_limit=3: allows interactive transactions ($transaction) + concurrent background queries
 *   without exhausting PostgreSQL max_connections across autoscaled serverless instances.
 * - pool_timeout=10: 10s timeout absorbs cold-start acquisition spikes while guaranteeing
 *   graceful error handling before serverless function execution timeout boundaries.
 * Preserves any explicit query parameters already present in the source DATABASE_URL.
 */
export function buildEffectiveDatabaseUrl(rawUrl = process.env.DATABASE_URL, overrides = {}) {
  if (!rawUrl || typeof rawUrl !== 'string') return undefined;

  const trimmed = rawUrl.trim();
  if (!trimmed) return undefined;

  // Preserve non-PostgreSQL protocols (e.g. SQLite, file:, mock:) without mutation
  if (trimmed.startsWith('file:') || trimmed.startsWith('sqlite:')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);

    // Apply connection_limit if not already explicitly specified
    if (!parsed.searchParams.has('connection_limit')) {
      const limit = overrides.connection_limit ?? DEFAULT_SERVERLESS_CONNECTION_LIMIT;
      parsed.searchParams.set('connection_limit', String(limit));
    }

    // Apply pool_timeout if not already explicitly specified (in seconds)
    if (!parsed.searchParams.has('pool_timeout')) {
      const timeout = overrides.pool_timeout ?? DEFAULT_SERVERLESS_POOL_TIMEOUT_SECONDS;
      parsed.searchParams.set('pool_timeout', String(timeout));
    }

    return parsed.toString();
  } catch {
    // If URL cannot be parsed via standard WHATWG URL parser, return as-is for safety
    return trimmed;
  }
}

export function createPrismaClient() {
  const effectiveUrl = buildEffectiveDatabaseUrl();
  const options = {
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  };

  if (effectiveUrl) {
    options.datasources = {
      db: {
        url: effectiveUrl,
      },
    };
  }

  return new PrismaClient(options);
}

const globalForPrisma = globalThis;

// Prevent multiple instances of Prisma Client in development / warm reloads
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
