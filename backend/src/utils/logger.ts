/**
 * Structured Logger — Zero-Cost Startup Edition
 *
 * Strategy:
 *   - Reads LOG_LEVEL from process.env (default: "info")
 *   - In production (NODE_ENV=production) + LOG_LEVEL=error → 99% of logs silently suppressed at runtime
 *   - All output goes to stdout/stderr only (Docker logs / PM2 / journald capture it for free)
 *   - NO paid log-ingestor SDK, NO file writes in Node (logrotate handles the ai-service python side)
 *   - ERROR-level logs are captured by Sentry automatically (see sentry.ts)
 *
 * Usage:
 *   import logger from '../utils/logger';
 *   logger.info('Server started on port %d', port);
 *   logger.error('DB connection failed', err);
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type Level = keyof typeof LEVELS;

function resolveLevel(): Level {
  const raw = (process.env.LOG_LEVEL || 'info').toLowerCase();
  return (raw in LEVELS ? raw : 'info') as Level;
}

const currentLevel = LEVELS[resolveLevel()];

function fmt(level: Level, args: unknown[]): string {
  const ts = new Date().toISOString();
  const msg = args
    .map(a => (a instanceof Error ? `${a.message}\n${a.stack}` : typeof a === 'object' ? JSON.stringify(a) : String(a)))
    .join(' ');
  return `${ts} [${level.toUpperCase()}] ${msg}`;
}

const logger = {
  debug: (...args: unknown[]) => {
    if (currentLevel <= LEVELS.debug) process.stdout.write(fmt('debug', args) + '\n');
  },
  info: (...args: unknown[]) => {
    if (currentLevel <= LEVELS.info) process.stdout.write(fmt('info', args) + '\n');
  },
  warn: (...args: unknown[]) => {
    if (currentLevel <= LEVELS.warn) process.stderr.write(fmt('warn', args) + '\n');
  },
  error: (...args: unknown[]) => {
    if (currentLevel <= LEVELS.error) process.stderr.write(fmt('error', args) + '\n');
  },
};

export default logger;
