import { Router } from 'express';
import { db } from '../db/index.js';

export const meta = Router();

// GET /api/me — current tenant + users (for the acting-user switcher).
meta.get('/me', (req, res) => {
  const { tenantId, userId } = req.ctx;
  const tenant = db.prepare(`SELECT * FROM tenants WHERE id = ?`).get(tenantId);
  const users = db
    .prepare(`SELECT id, name, role FROM users WHERE tenant_id = ? ORDER BY role DESC, name ASC`)
    .all(tenantId);
  res.json({ tenant, users, current_user_id: userId });
});

// GET /api/categories — distinct categories (for filters / forms).
meta.get('/categories', (req, res) => {
  const { tenantId } = req.ctx;
  const rows = db
    .prepare(`SELECT DISTINCT category FROM products WHERE tenant_id = ? ORDER BY category`)
    .all(tenantId) as { category: string }[];
  res.json(rows.map((r) => r.category));
});
