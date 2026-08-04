/**
 * Sentry Integration — Free Tier Crash Tracking ($0/month)
 *
 * Plan: Sentry Developer (Free) — 5,000 errors/month
 * What gets sent: ONLY uncaught exceptions & unhandled promise rejections
 * What does NOT get sent: routine INFO/DEBUG/WARN logs (those stay local)
 *
 * Setup:
 *   1. Sign up at https://sentry.io (free, no credit card)
 *   2. Create a Node.js project → copy DSN
 *   3. Add SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/XXX to your .env
 *
 * In production: set SENTRY_DSN in your server's environment variables.
 * In development: leave SENTRY_DSN empty — Sentry will be a no-op.
 */

import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;
const env = process.env.NODE_ENV || 'development';

if (dsn) {
  Sentry.init({
    dsn,
    environment: env,
    // Only capture 100% of crashes — no performance tracing (would use quota)
    tracesSampleRate: 0,
    // Capture 100% of errors that DO fire
    sampleRate: 1.0,
    // Attach breadcrumbs only for errors, not routine logs
    integrations: [
      // @ts-ignore
      Sentry.httpIntegration({ tracing: false }),
    ],
    beforeSend(event) {
      // Strip PII: remove user IP and email from error reports
      if (event.user) {
        delete event.user.ip_address;
        delete event.user.email;
      }
      return event;
    },
  });
}

/**
 * Call this early in index.ts (before any routes) to attach
 * the Sentry error handler to Express.
 */
export function initSentry(): void {
  if (!dsn) {
    // No DSN configured — Sentry is a no-op in this environment
    return;
  }
  // Already initialised above — nothing more to do here.
}

/**
 * Express error handler middleware — MUST be added AFTER all routes.
 * Forwards 5xx errors to Sentry automatically.
 */
export const sentryErrorHandler = Sentry.expressErrorHandler();

export default Sentry;
