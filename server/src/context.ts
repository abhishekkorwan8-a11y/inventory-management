import type { Request, Response, NextFunction } from 'express';
import { db } from './db/index.js';

// Single-tenant demo: the tenant is fixed, but every query is still
// tenant-scoped so the multi-tenant data model is exercised end to end.
export const DEMO_TENANT = 'tenant_demo';

export interface Ctx {
  tenantId: string;
  userId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      ctx: Ctx;
    }
  }
}

/** Resolve tenant + acting user for every request. */
export function withContext(req: Request, _res: Response, next: NextFunction): void {
  const tenantId = (req.header('x-tenant-id') as string) || DEMO_TENANT;
  let userId = (req.header('x-user-id') as string) || '';
  if (!userId) {
    const owner = db
      .prepare(`SELECT id FROM users WHERE tenant_id = ? AND role = 'owner' LIMIT 1`)
      .get(tenantId) as { id: string } | undefined;
    userId = owner?.id ?? 'user_owner';
  }
  req.ctx = { tenantId, userId };
  next();
}
