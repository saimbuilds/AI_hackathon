// Error tracking. A no-op unless SENTRY_DSN is set, so local runs and tests stay quiet.
import * as Sentry from '@sentry/node';

let ready = false;
function init() {
  if (ready || !process.env.SENTRY_DSN) return;
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0, environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV });
  ready = true;
}

export async function captureError(e: unknown, context: Record<string, unknown> = {}): Promise<void> {
  init();
  if (!ready) return;
  Sentry.withScope((scope) => {
    scope.setContext('fold', context);
    Sentry.captureException(e);
  });
  await Sentry.flush(2000); // serverless: events must leave before the lambda freezes
}
