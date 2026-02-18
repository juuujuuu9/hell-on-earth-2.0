/**
 * Simple in-memory rate limiter for API routes
 * 
 * Note: In production with multiple instances, use Redis or Vercel Edge Config.
 * This implementation works for single-instance deployments.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/** Clean up expired entries periodically */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 60000); // Clean up every minute

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

/**
 * Check if request is within rate limit
 * Returns { allowed, remaining, resetAt }
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { maxRequests: 100, windowMs: 60000 }
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = identifier;
  
  let entry = store.get(key);
  
  if (!entry || entry.resetAt < now) {
    // Create new window
    entry = {
      count: 1,
      resetAt: now + options.windowMs,
    };
    store.set(key, entry);
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetAt: entry.resetAt,
    };
  }
  
  // Increment counter
  entry.count++;
  
  const allowed = entry.count <= options.maxRequests;
  const remaining = Math.max(0, options.maxRequests - entry.count);
  
  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
  };
}

/** Get client IP from request */
export function getClientId(request: Request): string {
  // Use CF-Connecting-IP if behind Cloudflare, fallback to X-Forwarded-For or socket address
  const cfIp = request.headers.get('CF-Connecting-IP');
  if (cfIp) return cfIp;
  
  const forwarded = request.headers.get('X-Forwarded-For');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  // Fallback to cart cookie if available (for cart endpoints)
  const cookie = request.headers.get('Cookie');
  if (cookie) {
    const match = cookie.match(/cart_id=([^;]+)/);
    if (match) return `cart:${match[1]}`;
  }
  
  return 'anonymous';
}