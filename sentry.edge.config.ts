import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    process.env.SENTRY_DSN ||
    "https://32158c4a11115daf0d634ef8122475f7@o4512172376784896.ingest.de.sentry.io/4512172386025552",

  // Adjust trace sample rate for performance monitoring
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while setting up Sentry
  debug: false,
});
