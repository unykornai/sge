import client from "prom-client";
import type { Request, Response, NextFunction } from "express";

export const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpDuration = new client.Histogram({
  name: "http_request_duration_ms",
  help: "HTTP request duration in ms",
  labelNames: ["method", "route", "status"],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
});
register.registerMetric(httpDuration);

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on("finish", () => {
    const route = (req.route?.path as string) || req.path;
    httpDuration.labels(req.method, route, String(res.statusCode)).observe(Date.now() - start);
  });
  next();
}
