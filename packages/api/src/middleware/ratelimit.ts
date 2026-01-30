import type { NextFunction, Request, Response } from "express";

type Rule = { windowSec: number; limit: number };
type Keyer = (req: Request) => string;

type Opts = {
  isMockMode: boolean;
  redis?: { incr: (k: string) => Promise<number>; expire: (k: string, s: number) => Promise<any>; ttl: (k: string) => Promise<number> };
};

const mem = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(rule: Rule, keyer: Keyer, opts: Opts) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `rl:${req.path}:${keyer(req)}`;
    const windowMs = rule.windowSec * 1000;

    if (opts.isMockMode) {
      const item = mem.get(key);
      if (!item || item.resetAt <= now) {
        mem.set(key, { count: 1, resetAt: now + windowMs });
        res.setHeader("X-RateLimit-Limit", String(rule.limit));
        res.setHeader("X-RateLimit-Remaining", String(rule.limit - 1));
        res.setHeader("X-RateLimit-Reset", String(Math.floor((now + windowMs) / 1000)));
        return next();
      }
      item.count += 1;
      const remaining = Math.max(0, rule.limit - item.count);
      res.setHeader("X-RateLimit-Limit", String(rule.limit));
      res.setHeader("X-RateLimit-Remaining", String(remaining));
      res.setHeader("X-RateLimit-Reset", String(Math.floor(item.resetAt / 1000)));
      if (item.count > rule.limit) return res.status(429).json({ error: "rate_limited" });
      return next();
    }

    // REAL mode: Redis counter w/ TTL
    const n = await opts.redis!.incr(key);
    if (n === 1) await opts.redis!.expire(key, rule.windowSec);
    const ttl = await opts.redis!.ttl(key);
    const reset = Math.floor((Date.now() + ttl * 1000) / 1000);
    res.setHeader("X-RateLimit-Limit", String(rule.limit));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, rule.limit - n)));
    res.setHeader("X-RateLimit-Reset", String(reset));
    if (n > rule.limit) return res.status(429).json({ error: "rate_limited" });
    next();
  };
}

// common keyers
export const byIp: Keyer = (req) => {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length) {
    return xff.split(',')[0]?.trim() || req.ip || 'unknown';
  }
  if (Array.isArray(xff) && xff.length) {
    return String(xff[0]).split(',')[0]?.trim() || req.ip || 'unknown';
  }
  return req.ip || 'unknown';
};
export const byWallet: Keyer = (req) => (req.body?.wallet as string) || (req.query?.wallet as string) || "no-wallet";
