/**
 * test-setup.ts — Jest global test environment bootstrapping.
 *
 * Sets the minimum required environment variables so that backend modules
 * that read process.env at import time do not throw on missing secrets.
 * Actual secret values are irrelevant in unit tests — they are overridden
 * per-test where needed.
 */

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_SECRET = 'test-internal-secret';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
