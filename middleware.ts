import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory sliding-window store for edge & serverless invocations
const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes to prevent memory leaks with 5,000+ clients
let lastCleanup = Date.now();
function cleanupStaleEntries() {
  const now = Date.now();
  if (now - lastCleanup > 300_000) {
    lastCleanup = now;
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }
}

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

function getRouteConfig(pathname: string): RateLimitConfig {
  // Heavy AI routes (protects Gemini API quota & prevents denial-of-wallet)
  if (
    pathname.startsWith('/api/ai/') ||
    pathname.startsWith('/api/resume/tailor') ||
    pathname.startsWith('/api/resume/edit') ||
    pathname.startsWith('/api/career-guidance/generate')
  ) {
    return { limit: 20, windowMs: 60_000 }; // 20 requests per minute
  }

  // Auth & sensitive admin override endpoints
  if (
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/admin/founder-override')
  ) {
    return { limit: 15, windowMs: 60_000 }; // 15 requests per minute
  }

  // File & feedback upload endpoints
  if (
    pathname.startsWith('/api/employer/payment-proof') ||
    pathname.startsWith('/api/feedback') ||
    pathname.startsWith('/api/walkins')
  ) {
    return { limit: 25, windowMs: 60_000 }; // 25 submissions per minute
  }

  // Default API limit (covers search, details, health, etc.)
  return { limit: 120, windowMs: 60_000 }; // 120 requests per minute
}

export function middleware(req: NextRequest) {
  cleanupStaleEntries();

  const { pathname } = req.nextUrl;

  // Only apply to API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Identify client IP
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  const ip = (forwarded ? forwarded.split(',')[0].trim() : null) || realIp || cfConnectingIp || '127.0.0.1';

  const { limit, windowMs } = getRouteConfig(pathname);
  const key = `${ip}:${pathname.split('/')[2] || 'api'}`;
  const now = Date.now();

  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    // New or expired window
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    const res = NextResponse.next();
    res.headers.set('X-RateLimit-Limit', limit.toString());
    res.headers.set('X-RateLimit-Remaining', (limit - 1).toString());
    return res;
  }

  if (record.count >= limit) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return new NextResponse(
      JSON.stringify({
        error: 'Too Many Requests',
        message: `High traffic detected. You have exceeded the rate limit. Please wait ${retryAfter} seconds before trying again.`,
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  }

  record.count += 1;
  const remaining = Math.max(0, limit - record.count);

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
