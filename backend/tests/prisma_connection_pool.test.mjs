import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEffectiveDatabaseUrl,
  DEFAULT_SERVERLESS_CONNECTION_LIMIT,
  DEFAULT_SERVERLESS_POOL_TIMEOUT_SECONDS,
  prisma,
} from '../lib/prisma.js';

describe('Database Connection Limit & Pool Timeout Configuration (Prisma)', () => {
  it('applies default connection_limit=3 and pool_timeout=10 to standard postgresql URL', () => {
    const inputUrl = 'postgresql://postgres:secret@db.example.com:5432/kalceria_prod';
    const result = buildEffectiveDatabaseUrl(inputUrl);

    assert.ok(result);
    const parsed = new URL(result);
    assert.equal(parsed.searchParams.get('connection_limit'), '3');
    assert.equal(parsed.searchParams.get('pool_timeout'), '10');
    assert.equal(parsed.hostname, 'db.example.com');
    assert.equal(parsed.port, '5432');
    assert.equal(parsed.pathname, '/kalceria_prod');
  });

  it('preserves user-specified connection_limit and pool_timeout if already provided in DATABASE_URL', () => {
    const inputUrl = 'postgresql://postgres:secret@db.example.com:6543/kalceria_prod?connection_limit=5&pool_timeout=15&sslmode=require';
    const result = buildEffectiveDatabaseUrl(inputUrl);

    assert.ok(result);
    const parsed = new URL(result);
    assert.equal(parsed.searchParams.get('connection_limit'), '5');
    assert.equal(parsed.searchParams.get('pool_timeout'), '15');
    assert.equal(parsed.searchParams.get('sslmode'), 'require');
  });

  it('preserves existing connection_limit while appending missing pool_timeout', () => {
    const inputUrl = 'postgresql://postgres:secret@db.example.com:6543/kalceria_prod?connection_limit=2';
    const result = buildEffectiveDatabaseUrl(inputUrl);

    assert.ok(result);
    const parsed = new URL(result);
    assert.equal(parsed.searchParams.get('connection_limit'), '2');
    assert.equal(parsed.searchParams.get('pool_timeout'), '10');
  });

  it('preserves non-Postgres protocols without modification (e.g. SQLite / file:)', () => {
    const sqliteUrl = 'file:./dev.db';
    const result = buildEffectiveDatabaseUrl(sqliteUrl);
    assert.equal(result, 'file:./dev.db');
  });

  it('handles empty or non-string input safely without crashing', () => {
    assert.equal(buildEffectiveDatabaseUrl(null), undefined);
    assert.equal(buildEffectiveDatabaseUrl(''), undefined);
    assert.equal(buildEffectiveDatabaseUrl('   '), undefined);
  });

  it('prisma client exports correctly as singleton with active database methods', () => {
    assert.ok(prisma);
    assert.equal(typeof prisma.$connect, 'function');
    assert.equal(typeof prisma.$disconnect, 'function');
    assert.equal(typeof prisma.$transaction, 'function');
  });
});
