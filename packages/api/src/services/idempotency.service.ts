import crypto from "crypto";
import type { Request } from "express";

type Stored = {
  statusCode: number;
  body: unknown;
  headers?: Record<string, string>;
};

type Store = Map<string, Stored>;

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function canonicalRequestHash(req: Request, body: unknown) {
  const wallet =
    (req.body?.wallet as string | undefined) ||
    (req.query?.wallet as string | undefined) ||
    undefined;

  const payload = JSON.stringify(body ?? {});
  return {
    wallet,
    requestHash: sha256(`${req.method}|${req.path}|${wallet ?? ""}|${payload}`),
  };
}

export class IdempotencyService {
  private mem: Store;

  constructor(memStore?: Store) {
    this.mem = memStore ?? new Map();
  }

  // MOCK MODE
  getMem(key: string, requestHash: string) {
    return this.mem.get(`${key}:${requestHash}`);
  }
  setMem(key: string, requestHash: string, value: Stored) {
    this.mem.set(`${key}:${requestHash}`, value);
  }

  // REAL MODE (Prisma injected lazily to avoid DB import in MOCK mode)
  async getDb(prisma: any, key: string, requestHash: string): Promise<Stored | null> {
    const rec = await prisma.idempotencyRecord.findUnique({
      where: { key_requestHash: { key, requestHash } },
    });
    if (!rec) return null;
    return {
      statusCode: rec.statusCode,
      body: rec.responseBody,
      headers: (rec.responseHdrs as any) ?? undefined,
    };
  }

  async setDb(
    prisma: any,
    key: string,
    requestHash: string,
    meta: { method: string; path: string; wallet?: string },
    value: Stored
  ) {
    await prisma.idempotencyRecord.upsert({
      where: { key_requestHash: { key, requestHash } },
      update: {
        statusCode: value.statusCode,
        responseBody: value.body as any,
        responseHdrs: (value.headers ?? {}) as any,
        method: meta.method,
        path: meta.path,
        wallet: meta.wallet ?? null,
      },
      create: {
        key,
        requestHash,
        statusCode: value.statusCode,
        responseBody: value.body as any,
        responseHdrs: (value.headers ?? {}) as any,
        method: meta.method,
        path: meta.path,
        wallet: meta.wallet ?? null,
      },
    });
  }
}
