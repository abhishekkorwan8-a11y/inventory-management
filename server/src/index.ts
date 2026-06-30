import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import './db/index.js'; // ensure migrate() runs on boot
import { withContext } from './context.js';
import { products } from './routes/products.js';
import { suppliers } from './routes/suppliers.js';
import { purchaseOrders } from './routes/purchaseOrders.js';
import { sales } from './routes/sales.js';
import { dashboard } from './routes/dashboard.js';
import { meta } from './routes/meta.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

// API routes — all tenant-scoped via withContext.
const api = express.Router();
api.use(withContext);
api.get('/health', (_req, res) => res.json({ ok: true }));
api.use('/', meta);
api.use('/products', products);
api.use('/suppliers', suppliers);
api.use('/purchase-orders', purchaseOrders);
api.use('/sales', sales);
api.use('/dashboard', dashboard);
app.use('/api', api);

// Serve the built client in production (single deployable).
const clientDist = join(__dirname, '..', '..', 'client', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(join(clientDist, 'index.html')));
}

// Central error handler.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err?.status ?? 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err?.message ?? 'Internal server error' });
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`Inventory API listening on http://localhost:${PORT}`);
});
