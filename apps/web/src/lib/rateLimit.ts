// ─────────────────────────────────────────────────────────────────────────────
// rateLimit — simple in-memory per-IP rate limiter for API routes
// Replace with Upstash Redis in production for multi-instance deployments
// ─────────────────────────────────────────────────────────────────────────────

const requestLog = new Map<string, number[]>();
const RATE_LIMIT_RPM = parseInt(process.env.RATE_LIMIT_RPM ?? "10", 10);

export function isRateLimited(ip: string): boolean {
  const now     = Date.now();
  const window  = 60_000; // 1 minute
  const history = (requestLog.get(ip) ?? []).filter((t) => now - t < window);
  history.push(now);
  requestLog.set(ip, history);
  return history.length > RATE_LIMIT_RPM;
}

// Shared prompt injection guard patterns
const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|prior)\s+instructions/i,
  /<\|im_start\|>/,
  /\[INST\]/,
  /###\s*instruction/i,
  /system\s*:/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
];

export function hasInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((p) => p.test(text));
}
