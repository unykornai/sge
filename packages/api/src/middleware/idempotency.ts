import type { NextFunction, Request, Response } from "express";
import { canonicalRequestHash, IdempotencyService } from "../services/idempotency.service";

type Opts = {
  isMockMode: boolean;
  // In REAL mode, pass prisma client (or wrapper) from your db module
  prisma?: any;
  service: IdempotencyService;
};

export function idempotency(opts: Opts) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = req.header("Idempotency-Key");
    if (!key) return next();

    const { wallet, requestHash } = canonicalRequestHash(req, req.body);

    // Try read
    const cached = opts.isMockMode
      ? opts.service.getMem(key, requestHash)
      : await opts.service.getDb(opts.prisma, key, requestHash);

    if (cached) {
      if (cached.headers) {
        for (const [k, v] of Object.entries(cached.headers)) res.setHeader(k, v);
      }
      res.setHeader("X-Idempotency", "HIT");
      return res.status(cached.statusCode).json(cached.body);
    }

    // Capture response
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      const stored = { statusCode: res.statusCode, body, headers: { "content-type": "application/json" } };
      res.setHeader("X-Idempotency", "MISS");

      // Fire-and-forget safe store (do not block response)
      void (async () => {
        try {
          if (opts.isMockMode) {
            opts.service.setMem(key, requestHash, stored);
          } else {
            await opts.service.setDb(
              opts.prisma,
              key,
              requestHash,
              { method: req.method, path: req.path, wallet },
              stored
            );
          }
        } catch {
          // intentionally swallow to avoid breaking response path
        }
      })();

      return originalJson(body);
    };

    next();
  };
}
