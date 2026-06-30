// ============================================================================
//  SEED — generates a believable, "live looking" data set.
//
//  ~180 products across grocery/general-store categories, 9 suppliers, and
//  ~3 months of purchase + sale + adjustment history, all expressed as
//  immutable ledger movements. A small in-memory running balance is used
//  ONLY during generation to drive realistic reorder behaviour; the app
//  itself always re-derives quantities from the ledger.
// ============================================================================

import { nanoid } from 'nanoid';
import { db, migrate } from './index.js';

// ---- deterministic PRNG so reseeding is reproducible -----------------------
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260630);
const rint = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const chance = (p: number) => rand() < p;
const money = (n: number) => Math.round(n * 100) / 100;

const TENANT_ID = 'tenant_demo';
const DAYS = 90;
const today = new Date('2026-06-30T18:00:00Z');
const dayMs = 86_400_000;
const dateMinus = (days: number, hour = 9) => {
  const d = new Date(today.getTime() - days * dayMs);
  d.setUTCHours(hour, rint(0, 59), rint(0, 59), 0);
  return d.toISOString();
};

// ---- product catalogue building blocks -------------------------------------
const CATALOGUE: Record<string, { items: string[]; uom: string; cost: [number, number] }> = {
  'Beverages': {
    uom: 'bottle',
    cost: [0.4, 2.5],
    items: ['Cola', 'Diet Cola', 'Lemon Soda', 'Orange Soda', 'Ginger Ale', 'Sparkling Water',
      'Mineral Water 1L', 'Apple Juice', 'Orange Juice', 'Mango Juice', 'Iced Tea', 'Green Tea',
      'Energy Drink', 'Cold Brew Coffee', 'Coconut Water', 'Tonic Water', 'Cranberry Juice'],
  },
  'Snacks & Confectionery': {
    uom: 'pack',
    cost: [0.3, 2.0],
    items: ['Potato Chips', 'Salted Pretzels', 'Tortilla Chips', 'Cheese Crackers', 'Trail Mix',
      'Roasted Peanuts', 'Mixed Nuts', 'Granola Bar', 'Chocolate Bar', 'Dark Chocolate',
      'Gummy Bears', 'Popcorn', 'Rice Cakes', 'Cookies', 'Wafer Rolls', 'Caramel Toffee'],
  },
  'Dairy & Eggs': {
    uom: 'unit',
    cost: [0.6, 4.0],
    items: ['Whole Milk 1L', 'Skim Milk 1L', 'Greek Yogurt', 'Plain Yogurt', 'Cheddar Cheese',
      'Mozzarella', 'Butter 200g', 'Cream Cheese', 'Eggs (Dozen)', 'Sour Cream', 'Paneer 200g',
      'Cottage Cheese', 'Whipping Cream'],
  },
  'Bakery': {
    uom: 'unit',
    cost: [0.4, 3.0],
    items: ['White Bread', 'Whole Wheat Bread', 'Multigrain Loaf', 'Bagels (4pk)', 'Croissant',
      'Dinner Rolls', 'Burger Buns', 'Baguette', 'Muffin', 'Banana Bread'],
  },
  'Produce': {
    uom: 'kg',
    cost: [0.5, 5.0],
    items: ['Bananas', 'Apples', 'Oranges', 'Tomatoes', 'Onions', 'Potatoes', 'Carrots',
      'Spinach', 'Bell Peppers', 'Cucumbers', 'Lemons', 'Garlic', 'Broccoli', 'Avocado'],
  },
  'Frozen Foods': {
    uom: 'pack',
    cost: [1.0, 6.0],
    items: ['Frozen Peas', 'Frozen Corn', 'Mixed Vegetables', 'French Fries', 'Chicken Nuggets',
      'Fish Fingers', 'Ice Cream Tub', 'Frozen Pizza', 'Veg Spring Rolls', 'Frozen Berries'],
  },
  'Pantry & Staples': {
    uom: 'pack',
    cost: [0.5, 8.0],
    items: ['Basmati Rice 1kg', 'Brown Rice 1kg', 'All-Purpose Flour 1kg', 'Whole Wheat Flour 1kg',
      'White Sugar 1kg', 'Brown Sugar 500g', 'Table Salt 1kg', 'Olive Oil 500ml',
      'Sunflower Oil 1L', 'Pasta', 'Penne', 'Tomato Ketchup', 'Mayonnaise', 'Peanut Butter',
      'Honey 500g', 'Lentils 1kg', 'Chickpeas 1kg', 'Black Beans Can', 'Sweet Corn Can',
      'Instant Noodles', 'Cornflakes', 'Oats 1kg', 'Tea Bags (100)', 'Ground Coffee 250g'],
  },
  'Household': {
    uom: 'unit',
    cost: [0.8, 9.0],
    items: ['Dish Soap', 'Laundry Detergent', 'Fabric Softener', 'Surface Cleaner',
      'Glass Cleaner', 'Toilet Cleaner', 'Garbage Bags', 'Paper Towels', 'Toilet Paper (4pk)',
      'Aluminium Foil', 'Cling Film', 'Sponge Scrubber', 'Air Freshener', 'Floor Cleaner'],
  },
  'Personal Care': {
    uom: 'unit',
    cost: [0.7, 7.0],
    items: ['Shampoo', 'Conditioner', 'Bar Soap', 'Body Wash', 'Toothpaste', 'Toothbrush',
      'Hand Sanitiser', 'Deodorant', 'Face Wash', 'Moisturiser', 'Shaving Cream', 'Razor Pack'],
  },
  'Health & Wellness': {
    uom: 'unit',
    cost: [1.0, 12.0],
    items: ['Paracetamol (16)', 'Vitamin C Tablets', 'Multivitamins', 'Antacid Tablets',
      'Bandage Pack', 'Cough Syrup', 'Hand Cream', 'Sunscreen SPF50', 'Protein Bar', 'Electrolyte Mix'],
  },
};

const BRANDS = ['Marigold', 'Harvest', 'Sunrise', 'Everyday', 'Premier', 'Nature’s', 'Golden',
  'Fresh Co', 'Valley', 'Orchard', 'Bluebird', 'Cedar', 'Maple', 'Pure', 'Crisp'];

const SUPPLIERS = [
  { name: 'Greenfield Wholesale Co.', contact: 'orders@greenfield.example', address: '12 Market St, Springfield' },
  { name: 'Harborline Distributors', contact: 'sales@harborline.example', address: '88 Dock Rd, Portside' },
  { name: 'Valley Fresh Produce', contact: 'hello@valleyfresh.example', address: '5 Orchard Ln, Riverton' },
  { name: 'PrimeStock Foods', contact: 'supply@primestock.example', address: '210 Industrial Ave, Newton' },
  { name: 'DailyGoods Supply', contact: 'desk@dailygoods.example', address: '47 Commerce Blvd, Easton' },
  { name: 'Northgate Beverages', contact: 'b2b@northgate.example', address: '9 Bottling Way, Clearwater' },
  { name: 'HomeCare Essentials Ltd', contact: 'team@homecare.example', address: '33 Cleanline Dr, Westbrook' },
  { name: 'WellLife Pharma Supply', contact: 'rx@welllife.example', address: '71 Health Park, Ashford' },
  { name: 'FrostLine Cold Chain', contact: 'cold@frostline.example', address: '4 Glacier Rd, Bayview' },
];

// ============================================================================
function reseed() {
  migrate();

  // Wipe any existing demo data (idempotent reseed).
  const wipe = db.transaction(() => {
    for (const t of ['sale_lines', 'sales', 'purchase_order_lines', 'purchase_orders',
      'stock_movements', 'products', 'suppliers', 'users']) {
      db.prepare(`DELETE FROM ${t} WHERE tenant_id = ?`).run(TENANT_ID);
    }
    db.prepare(`DELETE FROM tenants WHERE id = ?`).run(TENANT_ID);
  });
  wipe();

  db.prepare(`INSERT INTO tenants (id, name) VALUES (?, ?)`).run(TENANT_ID, 'Cornerstone General Store');

  const users = [
    { id: 'user_owner', name: 'Priya Menon', role: 'owner' as const },
    { id: 'user_staff1', name: 'Diego Alvarez', role: 'staff' as const },
    { id: 'user_staff2', name: 'Sara Okafor', role: 'staff' as const },
  ];
  const insUser = db.prepare(`INSERT INTO users (id, tenant_id, name, role) VALUES (?, ?, ?, ?)`);
  for (const u of users) insUser.run(u.id, TENANT_ID, u.name, u.role);
  const userIds = users.map((u) => u.id);

  // suppliers
  const supplierIds: string[] = [];
  const insSupplier = db.prepare(
    `INSERT INTO suppliers (id, tenant_id, name, contact, address) VALUES (?, ?, ?, ?, ?)`
  );
  for (const s of SUPPLIERS) {
    const id = `sup_${nanoid(8)}`;
    supplierIds.push(id);
    insSupplier.run(id, TENANT_ID, s.name, s.contact, s.address);
  }

  // products
  interface P {
    id: string; category: string; uom: string; cost: number; price: number;
    reorderPoint: number; reorderQty: number; supplierId: string;
    velocity: number; running: number; status: 'active' | 'archived';
  }
  const products: P[] = [];
  const usedNames = new Set<string>();
  const insProduct = db.prepare(
    `INSERT INTO products (id, tenant_id, name, sku, category, unit_of_measure,
       cost_price, selling_price, reorder_point, reorder_qty, status)
     VALUES (@id, @tenant_id, @name, @sku, @category, @uom, @cost, @price,
       @reorder_point, @reorder_qty, @status)`
  );

  const categories = Object.keys(CATALOGUE);
  let skuSeq = 1000;
  const TARGET = 184;
  let guard = 0;
  while (products.length < TARGET && guard < 5000) {
    guard++;
    const category = pick(categories);
    const def = CATALOGUE[category];
    const item = pick(def.items);
    const brand = pick(BRANDS);
    const name = `${brand} ${item}`;
    if (usedNames.has(name)) continue;
    usedNames.add(name);

    const cost = money(def.cost[0] + rand() * (def.cost[1] - def.cost[0]));
    const margin = 1.2 + rand() * 0.7; // 20%–90% markup
    const price = money(cost * margin);
    const velocity = money(0.2 + rand() * 6); // avg units sold per day
    const reorderPoint = Math.max(5, Math.round(velocity * (4 + rand() * 6)));
    const reorderQty = Math.max(reorderPoint, Math.round(velocity * (14 + rand() * 16)));

    // supplier affinity: produce/frozen/health get matching suppliers, else any
    let supplierId: string;
    if (category === 'Produce') supplierId = supplierIds[2];
    else if (category === 'Frozen Foods') supplierId = supplierIds[8];
    else if (category === 'Beverages') supplierId = supplierIds[5];
    else if (category === 'Household') supplierId = supplierIds[6];
    else if (category === 'Personal Care' || category === 'Health & Wellness') supplierId = supplierIds[7];
    else supplierId = pick([supplierIds[0], supplierIds[1], supplierIds[3], supplierIds[4]]);

    const id = `prod_${nanoid(8)}`;
    const sku = `${category.slice(0, 3).toUpperCase()}-${skuSeq++}`;
    const status = chance(0.04) ? 'archived' : 'active';
    insProduct.run({
      id, tenant_id: TENANT_ID, name, sku, category, uom: def.uom,
      cost, price, reorder_point: reorderPoint, reorder_qty: reorderQty, status,
    });
    products.push({
      id, category, uom: def.uom, cost, price,
      reorderPoint, reorderQty, supplierId, velocity, running: 0,
      status: status as 'active' | 'archived',
    });
  }

  // ---- prepared statements for history -------------------------------------
  const insMovement = db.prepare(
    `INSERT INTO stock_movements
       (id, tenant_id, product_id, movement_type, direction, quantity, unit_cost,
        reason, reference_doc, user_id, occurred_at)
     VALUES (@id, @tenant_id, @product_id, @movement_type, @direction, @quantity,
        @unit_cost, @reason, @reference_doc, @user_id, @occurred_at)`
  );
  const insPO = db.prepare(
    `INSERT INTO purchase_orders (id, tenant_id, supplier_id, reference, status, notes, created_at, received_at)
     VALUES (@id, @tenant_id, @supplier_id, @reference, @status, @notes, @created_at, @received_at)`
  );
  const insPOLine = db.prepare(
    `INSERT INTO purchase_order_lines (id, tenant_id, po_id, product_id, quantity, unit_cost)
     VALUES (@id, @tenant_id, @po_id, @product_id, @quantity, @unit_cost)`
  );
  const insSale = db.prepare(
    `INSERT INTO sales (id, tenant_id, reference, total, notes, created_at)
     VALUES (@id, @tenant_id, @reference, @total, @notes, @created_at)`
  );
  const insSaleLine = db.prepare(
    `INSERT INTO sale_lines (id, tenant_id, sale_id, product_id, quantity, unit_price)
     VALUES (@id, @tenant_id, @sale_id, @product_id, @quantity, @unit_price)`
  );

  let poSeq = 1000;
  let invSeq = 5000;

  // Each scheduled receipt = a placed PO arriving on receiveDay.
  interface Sched { receiveDay: number; supplierId: string; reference: string; poId: string;
    lines: { productId: string; qty: number; unitCost: number }[]; createdDay: number; }
  const scheduled: Sched[] = [];
  const onOrder = new Set<string>();

  const receivePO = (s: Sched, dayIndex: number) => {
    insPO.run({
      id: s.poId, tenant_id: TENANT_ID, supplier_id: s.supplierId, reference: s.reference,
      status: 'received', notes: null,
      created_at: dateMinus(DAYS - s.createdDay, 8),
      received_at: dateMinus(DAYS - dayIndex, 11),
    });
    for (const ln of s.lines) {
      insPOLine.run({
        id: `pol_${nanoid(8)}`, tenant_id: TENANT_ID, po_id: s.poId,
        product_id: ln.productId, quantity: ln.qty, unit_cost: ln.unitCost,
      });
      insMovement.run({
        id: `mov_${nanoid(12)}`, tenant_id: TENANT_ID, product_id: ln.productId,
        movement_type: 'PURCHASE_RECEIPT', direction: 'IN', quantity: ln.qty,
        unit_cost: ln.unitCost, reason: null, reference_doc: s.reference,
        user_id: pick(userIds), occurred_at: dateMinus(DAYS - dayIndex, 11),
      });
      const p = products.find((x) => x.id === ln.productId);
      if (p) p.running += ln.qty;
      onOrder.delete(ln.productId);
    }
  };

  const run = db.transaction(() => {
    // ---- Day 0: opening stock — one received PO per supplier --------------
    const bySupplier = new Map<string, P[]>();
    for (const p of products) {
      if (!bySupplier.has(p.supplierId)) bySupplier.set(p.supplierId, []);
      bySupplier.get(p.supplierId)!.push(p);
    }
    for (const [supplierId, ps] of bySupplier) {
      const poId = `po_${nanoid(8)}`;
      const reference = `PO-${poSeq++}`;
      insPO.run({
        id: poId, tenant_id: TENANT_ID, supplier_id: supplierId, reference,
        status: 'received', notes: 'Opening stock', created_at: dateMinus(DAYS, 8),
        received_at: dateMinus(DAYS, 10),
      });
      for (const p of ps) {
        // Open near the natural reorder-cycle ceiling so the value series
        // looks like a stable, live business rather than a long sell-down.
        const qty = Math.round(p.reorderPoint + p.reorderQty * (0.6 + rand() * 0.5));
        const unitCost = money(p.cost * (0.95 + rand() * 0.08));
        insPOLine.run({
          id: `pol_${nanoid(8)}`, tenant_id: TENANT_ID, po_id: poId,
          product_id: p.id, quantity: qty, unit_cost: unitCost,
        });
        insMovement.run({
          id: `mov_${nanoid(12)}`, tenant_id: TENANT_ID, product_id: p.id,
          movement_type: 'PURCHASE_RECEIPT', direction: 'IN', quantity: qty,
          unit_cost: unitCost, reason: null, reference_doc: reference,
          user_id: pick(userIds), occurred_at: dateMinus(DAYS, 10),
        });
        p.running += qty;
      }
    }

    // ---- Days 1..90: daily sales + reorder loop ---------------------------
    for (let d = 1; d <= DAYS; d++) {
      // 1. receive any POs scheduled to arrive today
      for (const s of scheduled) if (s.receiveDay === d) receivePO(s, d);

      // 2. generate the day's demand
      const daySales: { productId: string; qty: number; price: number }[] = [];
      const weekendBoost = [0, 6].includes(new Date(today.getTime() - (DAYS - d) * dayMs).getUTCDay())
        ? 1.4 : 1.0;
      for (const p of products) {
        if (p.running <= 0) continue;
        const expected = p.velocity * weekendBoost * (0.5 + rand());
        let qty = Math.round(expected * (rand() < 0.7 ? 1 : 0));
        if (qty <= 0 && chance(0.25)) qty = rint(1, 2);
        qty = Math.min(qty, p.running); // seed never oversells
        if (qty > 0) {
          daySales.push({ productId: p.id, qty, price: p.price });
          p.running -= qty;
        }
      }

      // 3. group the day's lines into believable invoices (1–5 lines each)
      shuffle(daySales);
      let i = 0;
      while (i < daySales.length) {
        const lineCount = rint(1, 5);
        const chunk = daySales.slice(i, i + lineCount);
        i += lineCount;
        const saleId = `sale_${nanoid(8)}`;
        const reference = `INV-${invSeq++}`;
        const occurred = dateMinus(DAYS - d, rint(9, 19));
        const userId = pick(userIds);
        let total = 0;
        for (const ln of chunk) total += ln.qty * ln.price;
        insSale.run({
          id: saleId, tenant_id: TENANT_ID, reference, total: money(total),
          notes: null, created_at: occurred,
        });
        for (const ln of chunk) {
          insSaleLine.run({
            id: `sl_${nanoid(8)}`, tenant_id: TENANT_ID, sale_id: saleId,
            product_id: ln.productId, quantity: ln.qty, unit_price: ln.price,
          });
          insMovement.run({
            id: `mov_${nanoid(12)}`, tenant_id: TENANT_ID, product_id: ln.productId,
            movement_type: 'SALE', direction: 'OUT', quantity: ln.qty, unit_cost: null,
            reason: null, reference_doc: reference, user_id: userId, occurred_at: occurred,
          });
        }
      }

      // 4. occasional adjustments (damage / stock count) and returns
      if (chance(0.6)) {
        const p = pick(products);
        if (p.running > 2) {
          const qty = rint(1, 3);
          p.running -= qty;
          insMovement.run({
            id: `mov_${nanoid(12)}`, tenant_id: TENANT_ID, product_id: p.id,
            movement_type: 'ADJUSTMENT', direction: 'OUT', quantity: qty, unit_cost: null,
            reason: pick(['Damaged in storage', 'Expired stock removed', 'Stock count correction', 'Breakage']),
            reference_doc: `ADJ-${d}`, user_id: pick(userIds), occurred_at: dateMinus(DAYS - d, rint(9, 18)),
          });
        }
      }
      if (chance(0.18)) {
        const p = pick(products);
        const qty = rint(1, 2);
        p.running += qty;
        insMovement.run({
          id: `mov_${nanoid(12)}`, tenant_id: TENANT_ID, product_id: p.id,
          movement_type: 'RETURN', direction: 'IN', quantity: qty, unit_cost: p.cost,
          reason: 'Customer return', reference_doc: `RET-${d}`,
          user_id: pick(userIds), occurred_at: dateMinus(DAYS - d, rint(9, 18)),
        });
      }

      // 5. reorder: products at/below reorder point and not already on order
      const reorderBySupplier = new Map<string, P[]>();
      for (const p of products) {
        if (p.status === 'archived') continue;
        if (p.running <= p.reorderPoint && !onOrder.has(p.id)) {
          if (!reorderBySupplier.has(p.supplierId)) reorderBySupplier.set(p.supplierId, []);
          reorderBySupplier.get(p.supplierId)!.push(p);
        }
      }
      for (const [supplierId, ps] of reorderBySupplier) {
        const poId = `po_${nanoid(8)}`;
        const reference = `PO-${poSeq++}`;
        const leadTime = rint(2, 6);
        const sched: Sched = {
          receiveDay: d + leadTime, supplierId, reference, poId,
          createdDay: d, lines: [],
        };
        for (const p of ps) {
          const qty = p.reorderQty;
          const unitCost = money(p.cost * (0.93 + rand() * 0.12));
          sched.lines.push({ productId: p.id, qty, unitCost });
          onOrder.add(p.id);
        }
        scheduled.push(sched);
      }
    }

    // ---- POs ordered but not yet arrived stay as open drafts --------------
    for (const s of scheduled) {
      if (s.receiveDay > DAYS) {
        insPO.run({
          id: s.poId, tenant_id: TENANT_ID, supplier_id: s.supplierId, reference: s.reference,
          status: 'draft', notes: 'Awaiting delivery',
          created_at: dateMinus(DAYS - s.createdDay, 8), received_at: null,
        });
        for (const ln of s.lines) {
          insPOLine.run({
            id: `pol_${nanoid(8)}`, tenant_id: TENANT_ID, po_id: s.poId,
            product_id: ln.productId, quantity: ln.qty, unit_cost: ln.unitCost,
          });
        }
      }
    }
  });

  run();

  // ---- summary -------------------------------------------------------------
  const count = (t: string) =>
    (db.prepare(`SELECT COUNT(*) c FROM ${t} WHERE tenant_id = ?`).get(TENANT_ID) as { c: number }).c;
  console.log('Seed complete for tenant', TENANT_ID);
  console.log('  products          :', count('products'));
  console.log('  suppliers         :', count('suppliers'));
  console.log('  stock_movements   :', count('stock_movements'));
  console.log('  purchase_orders   :', count('purchase_orders'));
  console.log('  sales             :', count('sales'));
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

reseed();
